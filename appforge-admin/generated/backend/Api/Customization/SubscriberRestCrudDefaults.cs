#nullable enable

using Demo.TelegramOperations;
using Demo.TelegramOperations.Api.Contracts;
using Demo.TelegramOperations.Persistence;

namespace Demo.TelegramOperations.Api.Customization;

public sealed class SubscriberStandardCreateValidator
    : IRestCreateValidator<Subscriber, CreateSubscriberRequest>
{
    public ValueTask<RestCrudValidationResult> ValidateAsync(
        CreateSubscriberRequest request,
        RestCrudMutationContext context,
        CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);
        ArgumentNullException.ThrowIfNull(context);
        cancellationToken.ThrowIfCancellationRequested();
        if (string.IsNullOrWhiteSpace(request.Handle))
        {
            return ValueTask.FromResult(RestCrudValidationResult.Failure(RestCrudValidationFailureKind.Validation, "validation.required", "Handle"));
        }
        if (request.Handle.Length > 80)
        {
            return ValueTask.FromResult(RestCrudValidationResult.Failure(RestCrudValidationFailureKind.Validation, "validation.max_length", "Handle"));
        }
        if (string.IsNullOrWhiteSpace(request.DisplayName))
        {
            return ValueTask.FromResult(RestCrudValidationResult.Failure(RestCrudValidationFailureKind.Validation, "validation.required", "DisplayName"));
        }
        if (request.DisplayName.Length > 200)
        {
            return ValueTask.FromResult(RestCrudValidationResult.Failure(RestCrudValidationFailureKind.Validation, "validation.max_length", "DisplayName"));
        }
        if (request.StatusId == Guid.Empty)
        {
            return ValueTask.FromResult(RestCrudValidationResult.Failure(RestCrudValidationFailureKind.Validation, "validation.required", "StatusId"));
        }
        if (request.Note is not null && request.Note.Length > 500)
        {
            return ValueTask.FromResult(RestCrudValidationResult.Failure(RestCrudValidationFailureKind.Validation, "validation.max_length", "Note"));
        }
        return ValueTask.FromResult(RestCrudValidationResult.Valid);
    }
}

public sealed class SubscriberStandardUpdateValidator
    : IRestUpdateValidator<Subscriber, UpdateSubscriberRequest>
{
    public ValueTask<RestCrudValidationResult> ValidateAsync(
        Subscriber entity,
        UpdateSubscriberRequest request,
        RestCrudMutationContext context,
        CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(entity);
        ArgumentNullException.ThrowIfNull(request);
        ArgumentNullException.ThrowIfNull(context);
        cancellationToken.ThrowIfCancellationRequested();
        if (string.IsNullOrWhiteSpace(request.Handle))
        {
            return ValueTask.FromResult(RestCrudValidationResult.Failure(RestCrudValidationFailureKind.Validation, "validation.required", "Handle"));
        }
        if (request.Handle.Length > 80)
        {
            return ValueTask.FromResult(RestCrudValidationResult.Failure(RestCrudValidationFailureKind.Validation, "validation.max_length", "Handle"));
        }
        if (string.IsNullOrWhiteSpace(request.DisplayName))
        {
            return ValueTask.FromResult(RestCrudValidationResult.Failure(RestCrudValidationFailureKind.Validation, "validation.required", "DisplayName"));
        }
        if (request.DisplayName.Length > 200)
        {
            return ValueTask.FromResult(RestCrudValidationResult.Failure(RestCrudValidationFailureKind.Validation, "validation.max_length", "DisplayName"));
        }
        if (request.StatusId == Guid.Empty)
        {
            return ValueTask.FromResult(RestCrudValidationResult.Failure(RestCrudValidationFailureKind.Validation, "validation.required", "StatusId"));
        }
        if (request.Note is not null && request.Note.Length > 500)
        {
            return ValueTask.FromResult(RestCrudValidationResult.Failure(RestCrudValidationFailureKind.Validation, "validation.max_length", "Note"));
        }
        return ValueTask.FromResult(RestCrudValidationResult.Valid);
    }
}

public sealed class SubscriberDefaultCreateMutator
    : IRestCreateMutator<Subscriber, CreateSubscriberRequest>
{
    private readonly TelegramOperationsAdminDbContext _db;

    public SubscriberDefaultCreateMutator(TelegramOperationsAdminDbContext db)
    {
        _db = db ?? throw new ArgumentNullException(nameof(db));
    }

    public Task<Subscriber> MutateAsync(
        CreateSubscriberRequest request,
        RestCrudMutationContext context,
        CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);
        ArgumentNullException.ThrowIfNull(context);
        cancellationToken.ThrowIfCancellationRequested();
        var entity = new Subscriber
        {
            Id = Guid.NewGuid(),
            Handle = request.Handle,
            DisplayName = request.DisplayName,
            StatusId = request.StatusId,
            JoinedAt = request.JoinedAt,
            Note = request.Note,
            CreationTime = DateTime.UtcNow,
            CreatorId = context.CurrentUserId,
            CreatorPositionId = context.CurrentAuditPositionId,
            IsDeleted = false,
            HandleSearch = NormalizeSearchValue(request.Handle),
            DisplayNameSearch = NormalizeSearchValue(request.DisplayName),
            NoteSearch = NormalizeSearchValue(request.Note),
        };
        _db.Subscribers.Add(entity);
        return Task.FromResult(entity);
    }

    private static string NormalizeSearchValue(string? value)
    {
        return value?.Trim().ToUpperInvariant() ?? string.Empty;
    }
}

public sealed class SubscriberDefaultUpdateMutator
    : IRestUpdateMutator<Subscriber, UpdateSubscriberRequest>
{
    public SubscriberDefaultUpdateMutator(TelegramOperationsAdminDbContext db)
    {
        ArgumentNullException.ThrowIfNull(db);
    }

    public Task<Subscriber> MutateAsync(
        Subscriber entity,
        UpdateSubscriberRequest request,
        RestCrudMutationContext context,
        CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(entity);
        ArgumentNullException.ThrowIfNull(request);
        ArgumentNullException.ThrowIfNull(context);
        cancellationToken.ThrowIfCancellationRequested();
        entity.Handle = request.Handle;
        entity.DisplayName = request.DisplayName;
        entity.StatusId = request.StatusId;
        entity.JoinedAt = request.JoinedAt;
        entity.Note = request.Note;
        entity.HandleSearch = NormalizeSearchValue(request.Handle);
        entity.DisplayNameSearch = NormalizeSearchValue(request.DisplayName);
        entity.NoteSearch = NormalizeSearchValue(request.Note);
        entity.LastModificationTime = DateTime.UtcNow;
        entity.LastModifierId = context.CurrentUserId;
        entity.LastModifierPositionId = context.CurrentAuditPositionId;
        return Task.FromResult(entity);
    }

    private static string NormalizeSearchValue(string? value)
    {
        return value?.Trim().ToUpperInvariant() ?? string.Empty;
    }
}

public sealed class SubscriberDefaultDeleteMutator
    : IRestDeleteMutator<Subscriber>
{
    private readonly TelegramOperationsAdminDbContext _db;

    public SubscriberDefaultDeleteMutator(TelegramOperationsAdminDbContext db)
    {
        _db = db ?? throw new ArgumentNullException(nameof(db));
    }

    public Task MutateAsync(
        Subscriber entity,
        RestCrudMutationContext context,
        CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(entity);
        ArgumentNullException.ThrowIfNull(context);
        cancellationToken.ThrowIfCancellationRequested();
        entity.IsDeleted = true;
        entity.DeletionTime = DateTime.UtcNow;
        entity.DeleterId = context.CurrentUserId;
        entity.DeleterPositionId = context.CurrentAuditPositionId;
        return Task.CompletedTask;
    }
}
