using System.Data;
using Npgsql;
using Xunit;

namespace ReliableJobs.Tests;

/// <summary>
/// Real PostgreSQL concurrency and crash-recovery checks. Opt in with
/// JOBS_TEST_CONNECTION; no database is created or modified unless set.
/// Uses a dedicated temporary table per test, so no application data is touched.
/// </summary>
public class ConcurrencyIntegrationTests
{
    private static string? Connection => Environment.GetEnvironmentVariable("JOBS_TEST_CONNECTION");

    [Fact]
    [Trait("Category", "PostgreSQL")]
    public async Task SkippedLockedWorkIsReclaimedAfterRollback()
    {
        if (string.IsNullOrWhiteSpace(Connection))
            throw new InvalidOperationException("Set JOBS_TEST_CONNECTION to run real PostgreSQL integration checks.");
        await using var db = NpgsqlDataSource.Create(Connection);
        await using var keeper = await db.OpenConnectionAsync();
        var table = "portfolio_claim_" + Guid.NewGuid().ToString("N");
        try
        {
            await using (var create = new NpgsqlCommand($"CREATE TABLE {table} (id integer PRIMARY KEY, processed boolean NOT NULL DEFAULT false)", keeper))
                await create.ExecuteNonQueryAsync();
            await using (var insert = new NpgsqlCommand($"INSERT INTO {table}(id) VALUES (1),(2)", keeper))
                await insert.ExecuteNonQueryAsync();

            await using var first = await db.OpenConnectionAsync();
            await using var second = await db.OpenConnectionAsync();
            await using var firstTx = await first.BeginTransactionAsync(IsolationLevel.ReadCommitted);
            var firstId = await Claim(first, firstTx, table);
            Assert.Equal(1, firstId);
            await using (var secondTx = await second.BeginTransactionAsync(IsolationLevel.ReadCommitted))
            {
                Assert.Equal(2, await Claim(second, secondTx, table));
                await using var mark = new NpgsqlCommand($"UPDATE {table} SET processed = true WHERE id = 2", second, secondTx);
                await mark.ExecuteNonQueryAsync();
                await secondTx.CommitAsync();
            }
            // A worker crash/connection loss rolls back uncommitted state, releasing its lock.
            await firstTx.RollbackAsync();
            await using var recovery = await second.BeginTransactionAsync(IsolationLevel.ReadCommitted);
            Assert.Equal(1, await Claim(second, recovery, table));
            await recovery.RollbackAsync();
        }
        finally
        {
            await using var drop = new NpgsqlCommand($"DROP TABLE IF EXISTS {table}", keeper);
            await drop.ExecuteNonQueryAsync();
        }
    }

    [Fact]
    [Trait("Category", "PostgreSQL")]
    public async Task ConcurrentUniqueKeyClaimsHaveExactlyOneWinner()
    {
        if (string.IsNullOrWhiteSpace(Connection))
            throw new InvalidOperationException("Set JOBS_TEST_CONNECTION to run real PostgreSQL integration checks.");
        await using var db = NpgsqlDataSource.Create(Connection);
        await using var keeper = await db.OpenConnectionAsync();
        var table = "portfolio_dedupe_" + Guid.NewGuid().ToString("N");
        try
        {
            await using (var create = new NpgsqlCommand($"CREATE TABLE {table} (key text UNIQUE NOT NULL, payload text NOT NULL)", keeper))
                await create.ExecuteNonQueryAsync();
            var attempts = Enumerable.Range(0, 20).Select(async _ =>
            {
                await using var connection = await db.OpenConnectionAsync();
                await using var command = new NpgsqlCommand(
                    $"INSERT INTO {table}(key,payload) VALUES ('shared','same') ON CONFLICT(key) DO NOTHING", connection);
                return await command.ExecuteNonQueryAsync();
            });
            var inserted = await Task.WhenAll(attempts);
            Assert.Equal(1, inserted.Sum());
        }
        finally
        {
            await using var drop = new NpgsqlCommand($"DROP TABLE IF EXISTS {table}", keeper);
            await drop.ExecuteNonQueryAsync();
        }
    }

    private static async Task<int?> Claim(NpgsqlConnection conn, NpgsqlTransaction tx, string table)
    {
        await using var command = new NpgsqlCommand(
            $"SELECT id FROM {table} WHERE NOT processed ORDER BY id FOR UPDATE SKIP LOCKED LIMIT 1", conn, tx);
        var result = await command.ExecuteScalarAsync();
        return result is int id ? id : null;
    }
}
