using System.Data;
using Npgsql;
using ReliableJobs;

var builder = WebApplication.CreateBuilder(args);
var cs = builder.Configuration.GetConnectionString("Jobs");
if (string.IsNullOrWhiteSpace(cs))
    throw new InvalidOperationException("Configure ConnectionStrings__Jobs (see README.md).");

builder.Services.AddSingleton(NpgsqlDataSource.Create(cs));
builder.Services.AddHostedService<OutboxWorker>();

var app = builder.Build();
// Liveness only checks that the HTTP process is responding; it does not claim DB availability.
app.MapGet("/health", () => Results.Ok(new { status = "running" }));

// Readiness fails closed on a missing/unreachable database without leaking connection details.
app.MapGet("/ready", async (NpgsqlDataSource db, CancellationToken ct) =>
{
    using var timeout = CancellationTokenSource.CreateLinkedTokenSource(ct);
    timeout.CancelAfter(TimeSpan.FromSeconds(3));
    try
    {
        await using var conn = await db.OpenConnectionAsync(timeout.Token);
        await using var cmd = new NpgsqlCommand("SELECT 1", conn);
        var value = await cmd.ExecuteScalarAsync(timeout.Token);
        return value is int ready && ready == 1
            ? Results.Ok(new { status = "ready" })
            : Results.StatusCode(StatusCodes.Status503ServiceUnavailable);
    }
    catch (NpgsqlException)
    {
        return Results.StatusCode(StatusCodes.Status503ServiceUnavailable);
    }
    catch (TimeoutException)
    {
        return Results.StatusCode(StatusCodes.Status503ServiceUnavailable);
    }
    catch (InvalidOperationException)
    {
        return Results.StatusCode(StatusCodes.Status503ServiceUnavailable);
    }
    catch (OperationCanceledException) when (!ct.IsCancellationRequested)
    {
        return Results.StatusCode(StatusCodes.Status503ServiceUnavailable);
    }
});

app.MapPost("/jobs", async (JobRequest? body, HttpRequest request, NpgsqlDataSource db, CancellationToken ct) =>
{
    if (body?.Text is not { Length: > 0 and <= 2000 } || string.IsNullOrWhiteSpace(body.Text))
        return Results.BadRequest(new { error = "Text must be 1–2000 nonempty characters." });
    if (!request.Headers.TryGetValue("Idempotency-Key", out var header) ||
        header.Count != 1 || header.ToString() is not { Length: >= 10 and <= 128 } key ||
        key.Any(c => c < 33 || c > 126))
        return Results.BadRequest(new { error = "Provide one printable ASCII Idempotency-Key (10–128 chars)." });

    var hash = JobLogic.PayloadHash(body.Text);
    await using var conn = await db.OpenConnectionAsync(ct);
    await using var tx = await conn.BeginTransactionAsync(IsolationLevel.ReadCommitted, ct);
    var jobId = Guid.NewGuid();

    await using (var cmd = new NpgsqlCommand(
        "INSERT INTO jobs(id, idempotency_key, payload_sha256, input, status) " +
        "VALUES (@id, @key, @hash, @input, 'queued') " +
        "ON CONFLICT(idempotency_key) DO NOTHING RETURNING id", conn, tx))
    {
        cmd.Parameters.AddWithValue("id", jobId);
        cmd.Parameters.AddWithValue("key", key);
        cmd.Parameters.AddWithValue("hash", hash);
        cmd.Parameters.AddWithValue("input", body.Text);
        var inserted = await cmd.ExecuteScalarAsync(ct);
        if (inserted is Guid createdId)
        {
            // COMMIT of job + durable outbox is atomic; no best-effort publish after commit.
            await using var outbox = new NpgsqlCommand(
                "INSERT INTO outbox(id, job_id) VALUES (@eventId, @jobId)", conn, tx);
            outbox.Parameters.AddWithValue("eventId", Guid.NewGuid());
            outbox.Parameters.AddWithValue("jobId", createdId);
            await outbox.ExecuteNonQueryAsync(ct);
            await tx.CommitAsync(ct);
            return Results.Accepted($"/jobs/{createdId}", new { id = createdId, status = "queued" });
        }
    }

    // The uniqueness constraint serialized concurrent requests sharing the key.
    await using var lookup = new NpgsqlCommand(
        "SELECT id, payload_sha256 FROM jobs WHERE idempotency_key = @key", conn, tx);
    lookup.Parameters.AddWithValue("key", key);
    await using var reader = await lookup.ExecuteReaderAsync(ct);
    if (!await reader.ReadAsync(ct))
        throw new InvalidOperationException("Conflicting idempotency key was not found.");
    var existingId = reader.GetGuid(0);
    var existingHash = reader.GetString(1).Trim();
    await reader.DisposeAsync();
    await tx.CommitAsync(ct);
    return existingHash == hash
        ? Results.Ok(new { id = existingId, status = "already-accepted" })
        : Results.Conflict(new { error = "Idempotency-Key was already used for different input." });
});

// Small WAV-only job endpoint; media bytes live in the same transaction as the
// outbox event. This is deliberately local, unauthenticated portfolio code.
app.MapPost("/audio-jobs", async (AudioJobRequest? body, HttpRequest request, NpgsqlDataSource db, CancellationToken ct) =>
{
    if (body is null || string.IsNullOrWhiteSpace(body.WavBase64) ||
        body.Filename is not { Length: >= 5 and <= 100 } filename ||
        !filename.EndsWith(".wav", StringComparison.OrdinalIgnoreCase) ||
        filename.Any(c => !(char.IsAsciiLetterOrDigit(c) || c is '.' or '_' or '-')))
        return Results.BadRequest(new { error = "Use a simple .wav filename and base64 WAV bytes." });
    if (!request.Headers.TryGetValue("Idempotency-Key", out var header) ||
        header.Count != 1 || header.ToString() is not { Length: >= 10 and <= 128 } key ||
        key.Any(c => c < 33 || c > 126))
        return Results.BadRequest(new { error = "Provide a printable ASCII Idempotency-Key (10–128 chars)." });
    // Cap base64 size before allocating the decoded buffer.
    if (body.WavBase64.Length > 350_000)
        return Results.BadRequest(new { error = "WAV too large (256 KiB limit)." });
    byte[] wav;
    try { wav = Convert.FromBase64String(body.WavBase64); }
    catch (FormatException) { return Results.BadRequest(new { error = "Invalid base64." }); }
    if (wav.Length is < 44 or > 262_144 ||
        !wav.AsSpan(0, 4).SequenceEqual("RIFF"u8) ||
        !wav.AsSpan(8, 4).SequenceEqual("WAVE"u8))
        return Results.BadRequest(new { error = "Expected RIFF/WAVE, at most 256 KiB." });

    var hash = Convert.ToHexString(System.Security.Cryptography.SHA256.HashData(wav));
    await using var conn = await db.OpenConnectionAsync(ct);
    await using var tx = await conn.BeginTransactionAsync(IsolationLevel.ReadCommitted, ct);
    var id = Guid.NewGuid();
    await using (var cmd = new NpgsqlCommand(
        "INSERT INTO jobs(id,idempotency_key,payload_sha256,input,status,kind,audio_payload,audio_name) " +
        "VALUES (@id,@key,@hash,'','queued','audio',@wav,@name) " +
        "ON CONFLICT(idempotency_key) DO NOTHING RETURNING id", conn, tx))
    {
        cmd.Parameters.AddWithValue("id", id);
        cmd.Parameters.AddWithValue("key", key);
        cmd.Parameters.AddWithValue("hash", hash);
        cmd.Parameters.AddWithValue("wav", wav);
        cmd.Parameters.AddWithValue("name", filename);
        if (await cmd.ExecuteScalarAsync(ct) is Guid created)
        {
            await using var ev = new NpgsqlCommand(
                "INSERT INTO outbox(id,job_id) VALUES (@id,@job)",conn,tx);
            ev.Parameters.AddWithValue("id", Guid.NewGuid());
            ev.Parameters.AddWithValue("job", created);
            await ev.ExecuteNonQueryAsync(ct);
            await tx.CommitAsync(ct);
            return Results.Accepted($"/jobs/{created}",new { id = created, status = "queued" });
        }
    }
    await using var lookup = new NpgsqlCommand(
        "SELECT id,payload_sha256,kind,audio_name FROM jobs WHERE idempotency_key=@key",conn,tx);
    lookup.Parameters.AddWithValue("key",key);
    await using var reader = await lookup.ExecuteReaderAsync(ct);
    if (!await reader.ReadAsync(ct))
        throw new InvalidOperationException("Conflicting key not found.");
    var previousId = reader.GetGuid(0);
    var same = reader.GetString(1).Trim() == hash && reader.GetString(2) == "audio" && reader.GetString(3) == filename;
    await reader.DisposeAsync();
    await tx.CommitAsync(ct);
    return same ? Results.Ok(new { id = previousId, status = "already-accepted" })
        : Results.Conflict(new { error = "Key already used for a different job." });
});

app.MapGet("/jobs/{id:guid}", async (Guid id, NpgsqlDataSource db, CancellationToken ct) =>
{
    await using var conn = await db.OpenConnectionAsync(ct);
    await using var cmd = new NpgsqlCommand(
        "SELECT status, result::text FROM jobs WHERE id = @id", conn);
    cmd.Parameters.AddWithValue("id", id);
    await using var reader = await cmd.ExecuteReaderAsync(ct);
    if (!await reader.ReadAsync(ct)) return Results.NotFound();
    return Results.Ok(new { id, status = reader.GetString(0),
        result = reader.IsDBNull(1) ? (System.Text.Json.JsonElement?)null : System.Text.Json.JsonDocument.Parse(reader.GetString(1)).RootElement.Clone() });
});

app.Run();

public sealed record JobRequest(string Text);

public sealed record AudioJobRequest(string Filename, string WavBase64);
