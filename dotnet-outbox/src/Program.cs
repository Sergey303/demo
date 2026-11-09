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
// outbox event. Authentication is a deliberately narrow signed-token demo.
app.MapPost("/audio-jobs", async (AudioJobRequest? body, HttpRequest request, NpgsqlDataSource db, CancellationToken ct) =>
{
    var identity = AudioIdentity.FromAuthorization(request.Headers.Authorization.ToString(),
        Environment.GetEnvironmentVariable("DEMO_AUTH_SECRET"));
    if (identity is null) return Results.Unauthorized();
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
        "INSERT INTO jobs(id,idempotency_key,payload_sha256,input,status,kind,audio_payload,audio_name,tenant_id) " +
        "VALUES (@id,@key,@hash,'','queued','audio',@wav,@name,@tenant) " +
        "ON CONFLICT(idempotency_key) DO NOTHING RETURNING id", conn, tx))
    {
        cmd.Parameters.AddWithValue("id", id);
        cmd.Parameters.AddWithValue("key", key);
        cmd.Parameters.AddWithValue("hash", hash);
        cmd.Parameters.AddWithValue("wav", wav);
        cmd.Parameters.AddWithValue("name", filename);
        cmd.Parameters.AddWithValue("tenant", identity.Tenant);
        if (await cmd.ExecuteScalarAsync(ct) is Guid created)
        {
            await using var ev = new NpgsqlCommand(
                "INSERT INTO outbox(id,job_id) VALUES (@id,@job)",conn,tx);
            ev.Parameters.AddWithValue("id", Guid.NewGuid());
            ev.Parameters.AddWithValue("job", created);
            await ev.ExecuteNonQueryAsync(ct);
            // The owner grant is atomic with the accepted job and outbox event.
            await using var owner = new NpgsqlCommand(
                "INSERT INTO audio_read_grants(job_id,tenant_id,subject_id) VALUES (@id,@tenant,@subject)",conn,tx);
            owner.Parameters.AddWithValue("id", created);
            owner.Parameters.AddWithValue("tenant", identity.Tenant);
            owner.Parameters.AddWithValue("subject", identity.Subject);
            await owner.ExecuteNonQueryAsync(ct);
            await tx.CommitAsync(ct);
            return Results.Accepted($"/jobs/{created}",new { id = created, status = "queued" });
        }
    }
    await using var lookup = new NpgsqlCommand(
        "SELECT j.id,j.payload_sha256,j.kind,j.audio_name,j.tenant_id, " +
        "EXISTS(SELECT 1 FROM audio_read_grants g WHERE g.job_id=j.id " +
        "AND g.tenant_id=j.tenant_id AND g.subject_id=@subject) " +
        "FROM jobs j WHERE j.idempotency_key=@key",conn,tx);
    lookup.Parameters.AddWithValue("key",key);
    lookup.Parameters.AddWithValue("subject",identity.Subject);
    await using var reader = await lookup.ExecuteReaderAsync(ct);
    if (!await reader.ReadAsync(ct))
        throw new InvalidOperationException("Conflicting key not found.");
    var previousId = reader.GetGuid(0);
    var same = reader.GetString(2) == "audio" && reader.GetString(4) == identity.Tenant &&
        reader.GetBoolean(5) && reader.GetString(1).Trim() == hash &&
        !reader.IsDBNull(3) && reader.GetString(3) == filename;
    await reader.DisposeAsync();
    await tx.CommitAsync(ct);
    return same ? Results.Ok(new { id = previousId, status = "already-accepted" })
        : Results.Conflict(new { error = "Key already used for a different job." });
});

// EP-03: text documents reuse the durable jobs/outbox and existing tenant grants.
// The trusted demo principal is issued server-side by the localhost proxy only.
app.MapPost("/document-jobs", async (DocumentJobRequest? body, HttpRequest request,
    NpgsqlDataSource db, CancellationToken ct) =>
{
    var identity = AudioIdentity.FromAuthorization(request.Headers.Authorization.ToString(),
        Environment.GetEnvironmentVariable("DEMO_AUTH_SECRET"));
    if (identity is null) return Results.Unauthorized();
    if (body?.Filename is not { Length: >= 5 and <= 100 } filename ||
        !(filename.EndsWith(".txt", StringComparison.OrdinalIgnoreCase) ||
          filename.EndsWith(".md", StringComparison.OrdinalIgnoreCase)) ||
        filename.Any(c => !(char.IsAsciiLetterOrDigit(c) || c is '.' or '_' or '-')) ||
        body.Text is not { Length: > 0 } content || string.IsNullOrWhiteSpace(content) ||
        content.Contains('\0') || System.Text.Encoding.UTF8.GetByteCount(content) > 24_576)
        return Results.BadRequest(new { error = "Expected UTF-8 .txt/.md text of 1–24 KiB and simple ASCII filename." });
    if (!request.Headers.TryGetValue("Idempotency-Key", out var header) ||
        header.Count != 1 || header.ToString() is not { Length: >= 10 and <= 128 } key ||
        key.Any(c => c < 33 || c > 126))
        return Results.BadRequest(new { error = "Provide one printable ASCII Idempotency-Key (10–128 chars)." });

    var hash = Convert.ToHexString(System.Security.Cryptography.SHA256.HashData(
        System.Text.Encoding.UTF8.GetBytes(content)));
    await using var conn = await db.OpenConnectionAsync(ct);
    await using var tx = await conn.BeginTransactionAsync(IsolationLevel.ReadCommitted, ct);
    await using (var insert = new NpgsqlCommand(
        "INSERT INTO jobs(id,idempotency_key,payload_sha256,input,status,kind,document_name,tenant_id) " +
        "VALUES (@id,@key,@hash,@text,'queued','document',@name,@tenant) " +
        "ON CONFLICT(idempotency_key) DO NOTHING RETURNING id", conn, tx))
    {
        insert.Parameters.AddWithValue("id", Guid.NewGuid());
        insert.Parameters.AddWithValue("key", key);
        insert.Parameters.AddWithValue("hash", hash);
        insert.Parameters.AddWithValue("text", content);
        insert.Parameters.AddWithValue("name", filename);
        insert.Parameters.AddWithValue("tenant", identity.Tenant);
        if (await insert.ExecuteScalarAsync(ct) is Guid created)
        {
            await using var ev = new NpgsqlCommand(
                "INSERT INTO outbox(id,job_id) VALUES (@id,@job)", conn, tx);
            ev.Parameters.AddWithValue("id", Guid.NewGuid());
            ev.Parameters.AddWithValue("job", created);
            await ev.ExecuteNonQueryAsync(ct);
            // Legacy table name; the same per-job grants now cover document and audio.
            await using var grant = new NpgsqlCommand(
                "INSERT INTO audio_read_grants(job_id,tenant_id,subject_id) VALUES (@id,@tenant,@subject)",
                conn, tx);
            grant.Parameters.AddWithValue("id", created);
            grant.Parameters.AddWithValue("tenant", identity.Tenant);
            grant.Parameters.AddWithValue("subject", identity.Subject);
            await grant.ExecuteNonQueryAsync(ct);
            await tx.CommitAsync(ct);
            return Results.Accepted($"/jobs/{created}", new { id = created, status = "queued" });
        }
    }

    await using var lookup = new NpgsqlCommand(
        "SELECT j.id,j.payload_sha256,j.kind,j.document_name,j.tenant_id," +
        " EXISTS(SELECT 1 FROM audio_read_grants g WHERE g.job_id=j.id " +
        " AND g.tenant_id=j.tenant_id AND g.subject_id=@subject) " +
        "FROM jobs j WHERE j.idempotency_key=@key", conn, tx);
    lookup.Parameters.AddWithValue("key", key);
    lookup.Parameters.AddWithValue("subject", identity.Subject);
    await using var reader = await lookup.ExecuteReaderAsync(ct);
    if (!await reader.ReadAsync(ct))
        throw new InvalidOperationException("Conflicting document key was not found.");
    var existingId = reader.GetGuid(0);
    var same = reader.GetString(2) == "document" && reader.GetString(4) == identity.Tenant &&
        reader.GetBoolean(5) && reader.GetString(1).Trim() == hash &&
        !reader.IsDBNull(3) && reader.GetString(3) == filename;
    await reader.DisposeAsync();
    await tx.CommitAsync(ct);
    return same ? Results.Ok(new { id = existingId, status = "already-accepted" })
        : Results.Conflict(new { error = "Key already used for a different document or job." });
}).WithMetadata(new Microsoft.AspNetCore.Mvc.RequestSizeLimitAttribute(100_000));

app.MapGet("/jobs/{id:guid}", async (Guid id, HttpRequest request, NpgsqlDataSource db, CancellationToken ct) =>
{
    var identity = AudioIdentity.FromAuthorization(request.Headers.Authorization.ToString(),
        Environment.GetEnvironmentVariable("DEMO_AUTH_SECRET"));
    await using var conn = await db.OpenConnectionAsync(ct);
    await using var cmd = new NpgsqlCommand(
        // Text Hiring Demo stays public; audio and documents need current tenant grants.
        // A missing/invalid/revoked grant and nonexistent ID all return 404.
        "SELECT j.kind,j.status,j.result::text FROM jobs j WHERE j.id=@id AND (j.kind='text' OR " +
        "(j.kind IN ('audio','document') AND j.tenant_id=@tenant AND EXISTS(SELECT 1 FROM audio_read_grants g " +
        "WHERE g.job_id=j.id AND g.tenant_id=j.tenant_id AND g.subject_id=@subject)))", conn);
    cmd.Parameters.AddWithValue("id", id);
    cmd.Parameters.AddWithValue("tenant", identity?.Tenant ?? "");
    cmd.Parameters.AddWithValue("subject", identity?.Subject ?? "");
    await using var reader = await cmd.ExecuteReaderAsync(ct);
    if (!await reader.ReadAsync(ct)) return Results.NotFound();
    var kind = reader.GetString(0);
    var status = reader.GetString(1);
    System.Text.Json.Nodes.JsonNode? result = reader.IsDBNull(2)
        ? null : System.Text.Json.Nodes.JsonNode.Parse(reader.GetString(2));
    if ((kind is "audio" or "document") &&
        result is System.Text.Json.Nodes.JsonObject obj &&
        obj["segments"] is System.Text.Json.Nodes.JsonArray segments)
    {
        // Embeddings are retained in PostgreSQL for trusted search, never
        // serialized to browsers (not even for an authorized transcript).
        foreach (var segment in segments)
            if (segment is System.Text.Json.Nodes.JsonObject item)
                item.Remove("embedding");
    }
    return Results.Ok(new { id, status, result });
});

app.Run();

public sealed record JobRequest(string Text);

public sealed record AudioJobRequest(string Filename, string WavBase64);

public sealed record DocumentJobRequest(string Filename, string Text);
