#nullable enable

using System.Security.Cryptography;
using System.Text.Json;
using Demo.BusinessOperations;
using Demo.BusinessOperations.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Demo.BusinessOperations.Api.Services;

public sealed record RestCrudMutationResult<T>(T Value, bool Replayed);

public sealed class RestCrudMutationIdempotencyConflictException : Exception
{
    public RestCrudMutationIdempotencyConflictException()
        : base("The idempotency key was already used for a different REST mutation request.")
    {
    }
}

public sealed class RestCrudMutationIdempotencyService
{
    private const int CleanupBatchSize = 128;
    private static readonly TimeSpan ReceiptRetention = TimeSpan.FromDays(30);
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);
    private readonly BusinessOperationsAdminDbContext _db;

    public RestCrudMutationIdempotencyService(BusinessOperationsAdminDbContext db)
    {
        ArgumentNullException.ThrowIfNull(db);
        _db = db;
    }

    public static string CreateBodyFingerprint<TRequest>(TRequest request)
    {
        ArgumentNullException.ThrowIfNull(request);
        return ComputeFingerprint(new { Body = request });
    }

    public static string CreateRouteFingerprint<TKey>(TKey routeKey)
    {
        ArgumentNullException.ThrowIfNull(routeKey);
        return ComputeFingerprint(new { Route = routeKey });
    }

    public static string CreateRouteAndBodyFingerprint<TKey, TRequest>(TKey routeKey, TRequest request)
    {
        ArgumentNullException.ThrowIfNull(routeKey);
        ArgumentNullException.ThrowIfNull(request);
        return ComputeFingerprint(new { Route = routeKey, Body = request });
    }

    public async Task<RestCrudMutationResult<T>?> TryGetAsync<T>(
        string subjectKey,
        string endpointKey,
        string? idempotencyKey,
        string? requestFingerprint,
        CancellationToken cancellationToken)
    {
        if (idempotencyKey is null)
        {
            return null;
        }

        ValidateIdentity(subjectKey, endpointKey, idempotencyKey);
        ValidateRequestFingerprint(requestFingerprint);
        var receipt = await FindReceiptAsync(subjectKey, endpointKey, idempotencyKey, cancellationToken);
        if (receipt is null)
        {
            return null;
        }

        if (IsExpired(receipt))
        {
            await DeleteReceiptAsync(subjectKey, endpointKey, idempotencyKey, cancellationToken);
            return null;
        }

        EnsureFingerprintMatches(receipt, requestFingerprint!);
        if (string.IsNullOrWhiteSpace(receipt.ResponseJson))
        {
            throw new InvalidOperationException(
                $"REST mutation receipt '{endpointKey}' has no replay response.");
        }

        var value = JsonSerializer.Deserialize<T>(receipt.ResponseJson, JsonOptions)
            ?? throw new InvalidOperationException(
                $"REST mutation receipt '{endpointKey}' contains an invalid replay response.");
        return new RestCrudMutationResult<T>(value, Replayed: true);
    }

    public async Task<bool> HasCompletedAsync(
        string subjectKey,
        string endpointKey,
        string? idempotencyKey,
        string? requestFingerprint,
        CancellationToken cancellationToken)
    {
        if (idempotencyKey is null)
        {
            return false;
        }

        ValidateIdentity(subjectKey, endpointKey, idempotencyKey);
        ValidateRequestFingerprint(requestFingerprint);
        var receipt = await FindReceiptAsync(subjectKey, endpointKey, idempotencyKey, cancellationToken);
        if (receipt is null)
        {
            return false;
        }

        if (IsExpired(receipt))
        {
            await DeleteReceiptAsync(subjectKey, endpointKey, idempotencyKey, cancellationToken);
            return false;
        }

        EnsureFingerprintMatches(receipt, requestFingerprint!);
        return true;
    }

    public async Task<RestCrudMutationResult<T>> ExecuteAsync<T>(
        string subjectKey,
        string endpointKey,
        string? idempotencyKey,
        string? requestFingerprint,
        Func<CancellationToken, Task<T>> mutation,
        CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(mutation);
        if (idempotencyKey is null)
        {
            return new RestCrudMutationResult<T>(await mutation(cancellationToken), Replayed: false);
        }

        ValidateIdentity(subjectKey, endpointKey, idempotencyKey);
        ValidateRequestFingerprint(requestFingerprint);
        await CleanupExpiredReceiptsAsync(cancellationToken);

        var replay = await TryGetAsync<T>(
            subjectKey, endpointKey, idempotencyKey, requestFingerprint, cancellationToken);
        if (replay is not null)
        {
            return replay;
        }

        await using var transaction = await _db.Database.BeginTransactionAsync(cancellationToken);
        try
        {
            replay = await TryGetAsync<T>(
                subjectKey, endpointKey, idempotencyKey, requestFingerprint, cancellationToken);
            if (replay is not null)
            {
                await transaction.RollbackAsync(cancellationToken);
                return replay;
            }

            var receipt = NewReceipt(
                subjectKey,
                endpointKey,
                idempotencyKey,
                requestFingerprint!,
                responseJson: null);
            _db.AppForgeRestMutationReceipts.Add(receipt);
            await _db.SaveChangesAsync(cancellationToken);

            var value = await mutation(cancellationToken);
            receipt.ResponseJson = JsonSerializer.Serialize(value, JsonOptions);
            await _db.SaveChangesAsync(cancellationToken);
            await transaction.CommitAsync(cancellationToken);
            return new RestCrudMutationResult<T>(value, Replayed: false);
        }
        catch (DbUpdateException)
        {
            await transaction.RollbackAsync(cancellationToken);
            DetachPendingReceipts();
            replay = await TryGetAsync<T>(
                subjectKey, endpointKey, idempotencyKey, requestFingerprint, cancellationToken);
            if (replay is not null)
            {
                return replay;
            }
            throw;
        }
    }

    public async Task ExecuteNoContentAsync(
        string subjectKey,
        string endpointKey,
        string? idempotencyKey,
        string? requestFingerprint,
        Func<CancellationToken, Task> mutation,
        CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(mutation);
        if (idempotencyKey is null)
        {
            await mutation(cancellationToken);
            return;
        }

        ValidateIdentity(subjectKey, endpointKey, idempotencyKey);
        ValidateRequestFingerprint(requestFingerprint);
        await CleanupExpiredReceiptsAsync(cancellationToken);

        if (await HasCompletedAsync(
            subjectKey, endpointKey, idempotencyKey, requestFingerprint, cancellationToken))
        {
            return;
        }

        await using var transaction = await _db.Database.BeginTransactionAsync(cancellationToken);
        try
        {
            if (await HasCompletedAsync(
                subjectKey, endpointKey, idempotencyKey, requestFingerprint, cancellationToken))
            {
                await transaction.RollbackAsync(cancellationToken);
                return;
            }

            var receipt = NewReceipt(
                subjectKey,
                endpointKey,
                idempotencyKey,
                requestFingerprint!,
                responseJson: null);
            _db.AppForgeRestMutationReceipts.Add(receipt);
            await _db.SaveChangesAsync(cancellationToken);

            await mutation(cancellationToken);
            await _db.SaveChangesAsync(cancellationToken);
            await transaction.CommitAsync(cancellationToken);
        }
        catch (DbUpdateException)
        {
            await transaction.RollbackAsync(cancellationToken);
            DetachPendingReceipts();
            if (await HasCompletedAsync(
                subjectKey, endpointKey, idempotencyKey, requestFingerprint, cancellationToken))
            {
                return;
            }
            throw;
        }
    }

    private async Task CleanupExpiredReceiptsAsync(CancellationToken cancellationToken)
    {
        var cutoff = DateTime.UtcNow.Subtract(ReceiptRetention);
        var expiredIds = await _db.AppForgeRestMutationReceipts
            .AsNoTracking()
            .Where(item => item.CreatedAtUtc < cutoff)
            .OrderBy(item => item.CreatedAtUtc)
            .ThenBy(item => item.Id)
            .Select(item => item.Id)
            .Take(CleanupBatchSize)
            .ToArrayAsync(cancellationToken);
        if (expiredIds.Length == 0)
        {
            return;
        }

        await _db.AppForgeRestMutationReceipts
            .Where(item => expiredIds.Contains(item.Id))
            .ExecuteDeleteAsync(cancellationToken);
    }

    private Task<int> DeleteReceiptAsync(
        string subjectKey,
        string endpointKey,
        string idempotencyKey,
        CancellationToken cancellationToken)
    {
        return _db.AppForgeRestMutationReceipts
            .Where(item => item.SubjectKey == subjectKey
                && item.EndpointKey == endpointKey
                && item.IdempotencyKey == idempotencyKey)
            .ExecuteDeleteAsync(cancellationToken);
    }

    private Task<AppForgeRestMutationReceipt?> FindReceiptAsync(
        string subjectKey,
        string endpointKey,
        string idempotencyKey,
        CancellationToken cancellationToken)
    {
        return _db.AppForgeRestMutationReceipts.AsNoTracking().SingleOrDefaultAsync(
            item => item.SubjectKey == subjectKey
                && item.EndpointKey == endpointKey
                && item.IdempotencyKey == idempotencyKey,
            cancellationToken);
    }

    private static AppForgeRestMutationReceipt NewReceipt(
        string subjectKey,
        string endpointKey,
        string idempotencyKey,
        string requestFingerprint,
        string? responseJson)
    {
        return new AppForgeRestMutationReceipt
        {
            Id = Guid.NewGuid(),
            SubjectKey = subjectKey,
            EndpointKey = endpointKey,
            IdempotencyKey = idempotencyKey,
            RequestFingerprint = requestFingerprint,
            ResponseJson = responseJson,
            CreatedAtUtc = DateTime.UtcNow,
        };
    }

    private static string ComputeFingerprint<T>(T value)
    {
        var payload = JsonSerializer.SerializeToUtf8Bytes(value, JsonOptions);
        return Convert.ToHexString(SHA256.HashData(payload)).ToLowerInvariant();
    }

    private static bool IsExpired(AppForgeRestMutationReceipt receipt)
    {
        return receipt.CreatedAtUtc < DateTime.UtcNow.Subtract(ReceiptRetention);
    }

    private static void EnsureFingerprintMatches(
        AppForgeRestMutationReceipt receipt,
        string requestFingerprint)
    {
        if (!string.Equals(receipt.RequestFingerprint, requestFingerprint, StringComparison.Ordinal))
        {
            throw new RestCrudMutationIdempotencyConflictException();
        }
    }

    private void DetachPendingReceipts()
    {
        foreach (var entry in _db.ChangeTracker.Entries<AppForgeRestMutationReceipt>())
        {
            if (entry.State == EntityState.Added)
            {
                entry.State = EntityState.Detached;
            }
        }
    }

    private static void ValidateIdentity(
        string subjectKey,
        string endpointKey,
        string idempotencyKey)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(subjectKey);
        ArgumentException.ThrowIfNullOrWhiteSpace(endpointKey);
        ArgumentException.ThrowIfNullOrWhiteSpace(idempotencyKey);
        if (idempotencyKey.Length > 200)
        {
            throw new ArgumentException("Idempotency key cannot exceed 200 characters.", nameof(idempotencyKey));
        }
    }

    private static void ValidateRequestFingerprint(string? requestFingerprint)
    {
        if (string.IsNullOrWhiteSpace(requestFingerprint) || requestFingerprint.Length != 64)
        {
            throw new ArgumentException(
                "REST mutation request fingerprint must be a SHA-256 hex digest.",
                nameof(requestFingerprint));
        }
    }
}
