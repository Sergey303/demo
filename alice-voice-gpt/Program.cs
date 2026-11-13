using System.Collections.Concurrent;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;

var builder = WebApplication.CreateBuilder(args);
// Do not log URL paths: the webhook uses a secret token in its path.
builder.Logging.ClearProviders();
builder.Logging.AddJsonConsole();
builder.Logging.AddFilter("Microsoft.AspNetCore.Hosting.Diagnostics", LogLevel.Warning);
// Local-only listener. External HTTPS must be terminated by the existing reverse proxy.
if (string.IsNullOrWhiteSpace(Environment.GetEnvironmentVariable("ASPNETCORE_URLS")))
    builder.WebHost.UseUrls("http://127.0.0.1:5088");
builder.WebHost.ConfigureKestrel(options => options.Limits.MaxRequestBodySize = 16 * 1024);

string Secret(string environmentName) {
    var secretFile = builder.Configuration[environmentName + "_FILE"];
    if (!string.IsNullOrWhiteSpace(secretFile))
        return File.ReadAllText(secretFile).Trim();
    return builder.Configuration[environmentName] ?? "";
}
string token = Secret("ALICE_WEBHOOK_TOKEN");
if (token.Length < 32 || !token.All(c => char.IsAsciiLetterOrDigit(c) || c is '-' or '_'))
    throw new InvalidOperationException("Set ALICE_WEBHOOK_TOKEN (32+ ASCII letters/digits, '-' or '_').");

bool demo = string.Equals(builder.Configuration["Alice:DemoMode"] ?? builder.Configuration["DEMO_MODE"], "true", StringComparison.OrdinalIgnoreCase);
string? expectedSkillId = builder.Configuration["Alice:SkillId"] ?? builder.Configuration["YANDEX_SKILL_ID"];
int maxDailyRequests = int.TryParse(builder.Configuration["Alice:MaxDailyRequests"] ?? builder.Configuration["MAX_DAILY_REQUESTS"], out int configured)
    ? Math.Clamp(configured, 1, 500) : 30;

var app = builder.Build();
var states = new ConcurrentDictionary<string, UserState>(StringComparer.Ordinal);
app.MapGet("/health", () => Results.Ok(new { ok = true, demo }));

app.MapPost("/alice/{webhookToken}", async (string webhookToken, HttpContext context) => {
    // Public HTTPS endpoints have no Yandex-signed request token; the secret URL is the webhook guard.
    if (!FixedTimeMatch(webhookToken, token)) return Results.NotFound();

    JsonDocument request;
    try { request = await JsonDocument.ParseAsync(context.Request.Body, cancellationToken: context.RequestAborted); }
    catch (JsonException) { return Results.BadRequest(); }
    using (request) {
        var root = request.RootElement;
        if (!Read(root, "request", out var utterance)) return Results.BadRequest();
        if (GetString(utterance, "original_utterance") == "ping") return Reply("pong", true);
        if (!Read(root, "session", out var session)) return Results.BadRequest();
        if (!string.IsNullOrWhiteSpace(expectedSkillId) && GetString(session, "skill_id") != expectedSkillId)
            return Results.NotFound();
        var userId = Read(session, "user", out var user) ? GetString(user, "user_id") : null;
        userId ??= GetString(session, "user_id");
        userId ??= Read(session, "application", out var application) ? GetString(application, "application_id") : null;
        if (string.IsNullOrWhiteSpace(userId))
            return Reply("Не удалось определить пользователя.", true);

        var command = (GetString(utterance, "command") ?? "").Trim();
        if (command.Length > 800) return Reply("Слишком длинный вопрос. Пожалуйста, сократи его.", true);
        var control = command.ToLowerInvariant();
        bool wantsAnswer = control is "ответ" or "готово" or "готов ли ответ";
        if (control is "помощь" or "что ты умеешь" or "help" or "")
            return Reply("Задай вопрос, и я спрошу языковую модель. Если ответ готовится, скажи: ответ.", false);

        // Lightweight stale-state cleanup; no user transcripts are logged or persisted to disk.
        foreach (var stale in states.Where(x => x.Value.Touched < DateTimeOffset.UtcNow.AddHours(-1)))
            states.TryRemove(stale.Key, out _);
        var state = states.GetOrAdd(userId, _ => new UserState());
        Task<string>? pending;
        lock (state.Gate) {
            state.Touched = DateTimeOffset.UtcNow;
            if (state.Day != DateOnly.FromDateTime(DateTime.UtcNow)) {
                state.Day = DateOnly.FromDateTime(DateTime.UtcNow);
                state.CountToday = 0;
            }
            // A new question must not return a stale pending answer or silently discard it.
            if (state.Pending is not null && !wantsAnswer) {
                if (!state.Pending.IsCompleted)
                    return Reply("Предыдущий ответ ещё готовится. Скажи: ответ.", false);
                state.Pending = null;
            }
            if (state.Pending is null) {
                if (wantsAnswer)
                    return Reply("Сначала задай вопрос.", false);
                if (state.CountToday >= maxDailyRequests)
                    return Reply("Лимит вопросов на сегодня достигнут.", true);
                state.CountToday++;
                // Starting async work is intentional: the response may outlive Alice's 4.5s webhook limit.
                state.Pending = demo ? Task.FromResult("Демо-режим: вопрос получен. После входа Codex через ChatGPT будут реальные ответы.") : CodexAnswerer.AskAsync(command);
            }
            pending = state.Pending;
        }
        // Leave network overhead for Yandex. The job continues when this wait expires.
        var winner = await Task.WhenAny(pending!, Task.Delay(TimeSpan.FromMilliseconds(2600), context.RequestAborted));
        if (winner != pending) return Reply("Думаю над ответом. Скажи: ответ.", false);
        string answer;
        try { answer = await pending!; }
        catch (Exception ex) {
            app.Logger.LogWarning("LLM call failed: {Type}", ex.GetType().Name);
            answer = "Не удалось получить ответ. Попробуй повторить вопрос позже.";
        }
        lock (state.Gate) {
            if (ReferenceEquals(state.Pending, pending)) state.Pending = null;
        }
        return Reply(Shorten(answer), true);
    }
});

app.Run();

static bool Read(JsonElement element, string name, out JsonElement value) {
    if (element.ValueKind == JsonValueKind.Object)
        return element.TryGetProperty(name, out value);
    value = default;
    return false;
}

static string? GetString(JsonElement element, string key) =>
    Read(element, key, out var value) && value.ValueKind == JsonValueKind.String ? value.GetString() : null;

static bool FixedTimeMatch(string provided, string expected) {
    var a = SHA256.HashData(Encoding.UTF8.GetBytes(provided));
    var b = SHA256.HashData(Encoding.UTF8.GetBytes(expected));
    return CryptographicOperations.FixedTimeEquals(a, b);
}

static IResult Reply(string message, bool finish) => Results.Json(new {
    response = new { text = message, end_session = finish },
    version = "1.0"
});

static string Shorten(string answer) {
    answer = answer.Replace('\\', ' ').Replace('*', ' ').Replace('#', ' ').Trim();
    if (answer.Length <= 850) return answer;
    int last = answer.LastIndexOfAny(['.', '!', '?'], 800);
    return answer[..(last > 400 ? last + 1 : 800)].Trim();
}

sealed class UserState {
    public object Gate { get; } = new();
    public Task<string>? Pending { get; set; }
    public DateTimeOffset Touched { get; set; } = DateTimeOffset.UtcNow;
    public DateOnly Day { get; set; } = DateOnly.FromDateTime(DateTime.UtcNow);
    public int CountToday { get; set; }
}
