using System.Data.Common;
using Demo.BusinessOperations;
using Demo.BusinessOperations.Auth;
using Demo.BusinessOperations.Persistence;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Microsoft.Extensions.Configuration;
using Npgsql;

var raw = Environment.GetEnvironmentVariable("APPFORGE_ROTATION_TEST_CONNECTION")
    ?? throw new InvalidOperationException("Run through the disposable PostgreSQL test launcher.");
var connection = new NpgsqlConnectionStringBuilder(raw);
if (connection.Host != "127.0.0.1" || connection.Database != "appforge_rotation_test")
    throw new InvalidOperationException("Only the disposable loopback test database is permitted.");
using var deadline = new CancellationTokenSource(TimeSpan.FromSeconds(30));
var ct = deadline.Token;
var config = new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string, string?>
{
    ["AppForge:Auth:CodeDigestKey"] = Guid.NewGuid().ToString("N")
}).Build();

BusinessOperationsAdminDbContext Context(params IInterceptor[] interceptors) =>
    new(new DbContextOptionsBuilder<BusinessOperationsAdminDbContext>()
        .UseNpgsql(raw).AddInterceptors(interceptors).Options);
AuthTokenService Tokens(BusinessOperationsAdminDbContext db) =>
    new(db, new IdentityAuditService(db, new HttpContextAccessor()), config);
static void Check(bool condition, string message)
{
    if (!condition) throw new InvalidOperationException(message);
}

await using var setup = Context();
await setup.Database.EnsureCreatedAsync(ct);
var user = new AppUser
{
    Id = Guid.NewGuid(), Email = "rotation@example.test", UserName = "rotation-test",
    IsActive = true, EmailConfirmed = true, PasswordHash = "unused-test-only",
    CreatedAtUtc = DateTime.UtcNow, UpdatedAtUtc = DateTime.UtcNow
};
setup.AppUsers.Add(user);
await setup.SaveChangesAsync(ct);
var original = await Tokens(setup).CreateResponseAsync(user, ct);
var barrier = new TwoReaders();
await using var first = Context(barrier);
await using var second = Context(barrier);
// Both actual SELECTs must execute before either service may proceed to consumption.
var results = await Task.WhenAll(Tokens(first).RefreshAsync(original.RefreshToken, ct),
                                 Tokens(second).RefreshAsync(original.RefreshToken, ct));
var winners = results.Where(x => x is not null).ToArray();
await using var verify = Context();
var active = await verify.AppUserSessions.CountAsync(x => x.AppUserId == user.Id && x.RevokedAtUtc == null, ct);
Console.WriteLine($"CONCURRENT_REFRESH readers={barrier.Arrivals} winners={winners.Length} active_sessions={active}");
Check(barrier.Arrivals == 2, "Race schedule was not established.");
if (args.Contains("--baseline"))
{
    Check(winners.Length == 2 && active == 2, "Expected the old double-rotation defect.");
    Console.WriteLine("BASELINE_DOUBLE_ROTATION_REPRODUCED");
    return;
}
Check(winners.Length == 1 && active == 1, "Refresh token must be consumed exactly once.");
Check(await Tokens(verify).AuthenticateAccessTokenAsync(original.AccessToken, ct) is null, "Old access token survived.");
Check(await Tokens(verify).RefreshAsync(original.RefreshToken, ct) is null, "Old refresh token replay succeeded.");
var winner = winners.Single()!;
Check(await Tokens(verify).AuthenticateAccessTokenAsync(winner.AccessToken, ct) is not null, "Winner access token is invalid.");
// Fail after consumption but before the successor insert; transaction must roll back.
await using var failed = Context(new RejectSuccessor());
try
{
    await Tokens(failed).RefreshAsync(winner.RefreshToken, ct);
    throw new InvalidOperationException("Expected injected insert failure.");
}
catch (InjectedFailure)
{
    Console.WriteLine("SUCCESSOR_INSERT_FAILURE_INJECTED");
}
await using var retry = Context();
Check(await Tokens(retry).AuthenticateAccessTokenAsync(winner.AccessToken, ct) is not null,
    "Failed rotation revoked the previous access token.");
var recovered = await Tokens(retry).RefreshAsync(winner.RefreshToken, ct);
Check(recovered is not null, "Failed rotation consumed the refresh token.");
await using var final = Context();
Check(await final.AppUserSessions.CountAsync(x => x.AppUserId == user.Id && x.RevokedAtUtc == null, ct) == 1,
    "Rollback/retry created extra live sessions.");
Check(await Tokens(final).RefreshAsync(winner.RefreshToken, ct) is null, "Retired successor replay succeeded.");
Console.WriteLine("ROTATION_PASS one winner; replay denied; failed insert rolled back; retry succeeds");

sealed class TwoReaders : DbCommandInterceptor
{
    private int _arrivals;
    private readonly TaskCompletionSource _both = new(TaskCreationOptions.RunContinuationsAsynchronously);
    public int Arrivals => Volatile.Read(ref _arrivals);
    public override async ValueTask<DbDataReader> ReaderExecutedAsync(
        DbCommand command, CommandExecutedEventData eventData, DbDataReader result,
        CancellationToken cancellationToken = default)
    {
        if (command.CommandText.Contains("FROM \"AppUserSessions\"") &&
            command.CommandText.Contains("\"RefreshTokenHash\""))
        {
            if (Interlocked.Increment(ref _arrivals) == 2) _both.TrySetResult();
            await _both.Task.WaitAsync(cancellationToken);
        }
        return result;
    }
}
sealed class InjectedFailure : Exception;
sealed class RejectSuccessor : SaveChangesInterceptor
{
    public override ValueTask<InterceptionResult<int>> SavingChangesAsync(
        DbContextEventData eventData, InterceptionResult<int> result,
        CancellationToken cancellationToken = default)
    {
        if (eventData.Context!.ChangeTracker.Entries<AppUserSession>().Any(x => x.State == EntityState.Added))
            throw new InjectedFailure();
        return ValueTask.FromResult(result);
    }
}
