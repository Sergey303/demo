#nullable enable

using Demo.TelegramOperations;
using Demo.TelegramOperations.Api.Contracts;
using Demo.TelegramOperations.Persistence;

namespace Demo.TelegramOperations.Api.Customization;

public sealed class SubscriberStatusStandardCreateValidator
    : IRestCreateValidator<SubscriberStatus, CreateSubscriberStatusRequest>
{
    public ValueTask<RestCrudValidationResult> ValidateAsync(
        CreateSubscriberStatusRequest request,
        RestCrudMutationContext context,
        CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);
        ArgumentNullException.ThrowIfNull(context);
        cancellationToken.ThrowIfCancellationRequested();
        if (string.IsNullOrWhiteSpace(request.Code))
        {
            return ValueTask.FromResult(RestCrudValidationResult.Failure(RestCrudValidationFailureKind.Validation, "validation.required", "Code"));
        }
        if (request.Code.Length > 64)
        {
            return ValueTask.FromResult(RestCrudValidationResult.Failure(RestCrudValidationFailureKind.Validation, "validation.max_length", "Code"));
        }
        if (string.IsNullOrWhiteSpace(request.Name))
        {
            return ValueTask.FromResult(RestCrudValidationResult.Failure(RestCrudValidationFailureKind.Validation, "validation.required", "Name"));
        }
        if (request.Name.Length > 200)
        {
            return ValueTask.FromResult(RestCrudValidationResult.Failure(RestCrudValidationFailureKind.Validation, "validation.max_length", "Name"));
        }
        return ValueTask.FromResult(RestCrudValidationResult.Valid);
    }
}

public sealed class SubscriberStatusStandardUpdateValidator
    : IRestUpdateValidator<SubscriberStatus, UpdateSubscriberStatusRequest>
{
    public ValueTask<RestCrudValidationResult> ValidateAsync(
        SubscriberStatus entity,
        UpdateSubscriberStatusRequest request,
        RestCrudMutationContext context,
        CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(entity);
        ArgumentNullException.ThrowIfNull(request);
        ArgumentNullException.ThrowIfNull(context);
        cancellationToken.ThrowIfCancellationRequested();
        if (string.IsNullOrWhiteSpace(request.Code))
        {
            return ValueTask.FromResult(RestCrudValidationResult.Failure(RestCrudValidationFailureKind.Validation, "validation.required", "Code"));
        }
        if (request.Code.Length > 64)
        {
            return ValueTask.FromResult(RestCrudValidationResult.Failure(RestCrudValidationFailureKind.Validation, "validation.max_length", "Code"));
        }
        if (string.IsNullOrWhiteSpace(request.Name))
        {
            return ValueTask.FromResult(RestCrudValidationResult.Failure(RestCrudValidationFailureKind.Validation, "validation.required", "Name"));
        }
        if (request.Name.Length > 200)
        {
            return ValueTask.FromResult(RestCrudValidationResult.Failure(RestCrudValidationFailureKind.Validation, "validation.max_length", "Name"));
        }
        return ValueTask.FromResult(RestCrudValidationResult.Valid);
    }
}

public sealed class SubscriberStatusDefaultCreateMutator
    : IRestCreateMutator<SubscriberStatus, CreateSubscriberStatusRequest>
{
    private readonly TelegramOperationsAdminDbContext _db;

    public SubscriberStatusDefaultCreateMutator(TelegramOperationsAdminDbContext db)
    {
        _db = db ?? throw new ArgumentNullException(nameof(db));
    }

    public Task<SubscriberStatus> MutateAsync(
        CreateSubscriberStatusRequest request,
        RestCrudMutationContext context,
        CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);
        ArgumentNullException.ThrowIfNull(context);
        cancellationToken.ThrowIfCancellationRequested();
        var entity = new SubscriberStatus
        {
            Id = Guid.NewGuid(),
            Code = request.Code,
            Name = request.Name,
            SortOrder = request.SortOrder,
        };
        _db.SubscriberStatuses.Add(entity);
        return Task.FromResult(entity);
    }

    private static string NormalizeSearchValue(string? value)
    {
        return value?.Trim().ToUpperInvariant() ?? string.Empty;
    }
}

public sealed class SubscriberStatusDefaultUpdateMutator
    : IRestUpdateMutator<SubscriberStatus, UpdateSubscriberStatusRequest>
{
    public SubscriberStatusDefaultUpdateMutator(TelegramOperationsAdminDbContext db)
    {
        ArgumentNullException.ThrowIfNull(db);
    }

    public Task<SubscriberStatus> MutateAsync(
        SubscriberStatus entity,
        UpdateSubscriberStatusRequest request,
        RestCrudMutationContext context,
        CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(entity);
        ArgumentNullException.ThrowIfNull(request);
        ArgumentNullException.ThrowIfNull(context);
        cancellationToken.ThrowIfCancellationRequested();
        entity.Code = request.Code;
        entity.Name = request.Name;
        entity.SortOrder = request.SortOrder;
        return Task.FromResult(entity);
    }

    private static string NormalizeSearchValue(string? value)
    {
        return value?.Trim().ToUpperInvariant() ?? string.Empty;
    }
}

public sealed class SubscriberStatusDefaultDeleteMutator
    : IRestDeleteMutator<SubscriberStatus>
{
    private readonly TelegramOperationsAdminDbContext _db;

    public SubscriberStatusDefaultDeleteMutator(TelegramOperationsAdminDbContext db)
    {
        _db = db ?? throw new ArgumentNullException(nameof(db));
    }

    public Task MutateAsync(
        SubscriberStatus entity,
        RestCrudMutationContext context,
        CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(entity);
        ArgumentNullException.ThrowIfNull(context);
        cancellationToken.ThrowIfCancellationRequested();
        _db.SubscriberStatuses.Remove(entity);
        return Task.CompletedTask;
    }
}
