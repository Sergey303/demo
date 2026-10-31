using System.Data;
using System.Text.Json;
using Npgsql;

namespace ReliableJobs;

/// <summary>
/// A minimal transactional outbox consumer. SKIP LOCKED supports multiple workers.
/// The demonstration's only side effect is a row update in the same PostgreSQL
/// transaction, making retries safe. External calls need a separate idempotency
/// contract and must NOT be described as exactly-once delivery.
/// </summary>
public sealed class OutboxWorker(NpgsqlDataSource db, ILogger<OutboxWorker> log) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            var processed = false;
            try { processed = await ProcessOneAsync(stoppingToken); }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested) { break; }
            catch (Exception ex) { log.LogWarning(ex, "Outbox poll failed; will retry"); }

            // Do not impose a 500 ms latency after every processed event.
            // Pause only when idle or after an infrastructure/transaction error.
            if (!processed)
            {
                try { await Task.Delay(TimeSpan.FromMilliseconds(500), stoppingToken); }
                catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested) { break; }
            }
        }
    }

    private async Task<bool> ProcessOneAsync(CancellationToken ct)
    {
        await using var conn = await db.OpenConnectionAsync(ct);
        await using var tx = await conn.BeginTransactionAsync(IsolationLevel.ReadCommitted, ct);

        Guid eventId, jobId;
        int attempts;
        await using (var select = new NpgsqlCommand(
            "SELECT id, job_id, attempts FROM outbox " +
            "WHERE processed_at IS NULL AND next_attempt_at <= now() " +
            "ORDER BY next_attempt_at, created_at FOR UPDATE SKIP LOCKED LIMIT 1", conn, tx))
        await using (var reader = await select.ExecuteReaderAsync(ct))
        {
            if (!await reader.ReadAsync(ct)) { await tx.CommitAsync(ct); return false; }
            eventId = reader.GetGuid(0);
            jobId = reader.GetGuid(1);
            attempts = reader.GetInt32(2);
        }

        try
        {
            string input;
            await using (var read = new NpgsqlCommand(
                "SELECT input FROM jobs WHERE id = @id FOR UPDATE", conn, tx))
            {
                read.Parameters.AddWithValue("id", jobId);
                input = (string)(await read.ExecuteScalarAsync(ct)
                    ?? throw new InvalidOperationException("Outbox points to a missing job."));
            }

            var result = JobLogic.Process(input);
            await using (var save = new NpgsqlCommand(
                "UPDATE jobs SET status = 'done', result = @result::jsonb, updated_at = now() " +
                "WHERE id = @id", conn, tx))
            {
                save.Parameters.AddWithValue("result", JsonSerializer.Serialize(result));
                save.Parameters.AddWithValue("id", jobId);
                await save.ExecuteNonQueryAsync(ct);
            }

            await using (var mark = new NpgsqlCommand(
                "UPDATE outbox SET processed_at = now(), last_error = NULL WHERE id = @id", conn, tx))
            {
                mark.Parameters.AddWithValue("id", eventId);
                await mark.ExecuteNonQueryAsync(ct);
            }

            await tx.CommitAsync(ct);
            log.LogInformation("Processed event {EventId} for job {JobId}", eventId, jobId);
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            // This recovery path is for *application handler* failures. A failed DB
            // connection/transaction will roll back and the row stays visible for retry.
            log.LogWarning(ex, "Handler failed for event {EventId}", eventId);
            var nextAttempt = attempts + 1;
            await using (var retry = new NpgsqlCommand(
                "UPDATE outbox SET attempts = @attempt, next_attempt_at = @after, " +
                "last_error = @error WHERE id = @id", conn, tx))
            {
                retry.Parameters.AddWithValue("attempt", nextAttempt);
                retry.Parameters.AddWithValue("after", nextAttempt >= RetryPolicy.MaxAttempts
                    ? DateTime.MaxValue.ToUniversalTime()
                    : DateTime.UtcNow.Add(RetryPolicy.Delay(nextAttempt)));
                // Only diagnostic type; never copy potentially secret exception text into DB.
                retry.Parameters.AddWithValue("error", ex.GetType().Name);
                retry.Parameters.AddWithValue("id", eventId);
                await retry.ExecuteNonQueryAsync(ct);
            }
            if (nextAttempt >= RetryPolicy.MaxAttempts)
            {
                await using var fail = new NpgsqlCommand(
                    "UPDATE jobs SET status = 'failed', updated_at = now() WHERE id = @id", conn, tx);
                fail.Parameters.AddWithValue("id", jobId);
                await fail.ExecuteNonQueryAsync(ct);
            }
            await tx.CommitAsync(ct);
        }
        return true;
    }
}
