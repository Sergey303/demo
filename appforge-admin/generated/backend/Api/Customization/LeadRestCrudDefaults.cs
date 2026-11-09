#nullable enable

using Demo.TelegramOperations;
using Demo.TelegramOperations.Api.Contracts;
using Demo.TelegramOperations.Persistence;

namespace Demo.TelegramOperations.Api.Customization;

public sealed class LeadStandardCreateValidator
    : IRestCreateValidator<Lead, CreateLeadRequest>
{
    public ValueTask<RestCrudValidationResult> ValidateAsync(
        CreateLeadRequest request,
        RestCrudMutationContext context,
        CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);
        ArgumentNullException.ThrowIfNull(context);
        cancellationToken.ThrowIfCancellationRequested();
        if (request.SubscriberId == Guid.Empty)
        {
            return ValueTask.FromResult(RestCrudValidationResult.Failure(RestCrudValidationFailureKind.Validation, "validation.required", "SubscriberId"));
        }
        if (string.IsNullOrWhiteSpace(request.Subject))
        {
            return ValueTask.FromResult(RestCrudValidationResult.Failure(RestCrudValidationFailureKind.Validation, "validation.required", "Subject"));
        }
        if (request.Subject.Length > 200)
        {
            return ValueTask.FromResult(RestCrudValidationResult.Failure(RestCrudValidationFailureKind.Validation, "validation.max_length", "Subject"));
        }
        if (request.StatusId == Guid.Empty)
        {
            return ValueTask.FromResult(RestCrudValidationResult.Failure(RestCrudValidationFailureKind.Validation, "validation.required", "StatusId"));
        }
        if (request.Owner is not null && request.Owner.Length > 120)
        {
            return ValueTask.FromResult(RestCrudValidationResult.Failure(RestCrudValidationFailureKind.Validation, "validation.max_length", "Owner"));
        }
        if (request.Note is not null && request.Note.Length > 1000)
        {
            return ValueTask.FromResult(RestCrudValidationResult.Failure(RestCrudValidationFailureKind.Validation, "validation.max_length", "Note"));
        }
        return ValueTask.FromResult(RestCrudValidationResult.Valid);
    }
}

public sealed class LeadStandardUpdateValidator
    : IRestUpdateValidator<Lead, UpdateLeadRequest>
{
    public ValueTask<RestCrudValidationResult> ValidateAsync(
        Lead entity,
        UpdateLeadRequest request,
        RestCrudMutationContext context,
        CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(entity);
        ArgumentNullException.ThrowIfNull(request);
        ArgumentNullException.ThrowIfNull(context);
        cancellationToken.ThrowIfCancellationRequested();
        if (request.SubscriberId == Guid.Empty)
        {
            return ValueTask.FromResult(RestCrudValidationResult.Failure(RestCrudValidationFailureKind.Validation, "validation.required", "SubscriberId"));
        }
        if (string.IsNullOrWhiteSpace(request.Subject))
        {
            return ValueTask.FromResult(RestCrudValidationResult.Failure(RestCrudValidationFailureKind.Validation, "validation.required", "Subject"));
        }
        if (request.Subject.Length > 200)
        {
            return ValueTask.FromResult(RestCrudValidationResult.Failure(RestCrudValidationFailureKind.Validation, "validation.max_length", "Subject"));
        }
        if (request.StatusId == Guid.Empty)
        {
            return ValueTask.FromResult(RestCrudValidationResult.Failure(RestCrudValidationFailureKind.Validation, "validation.required", "StatusId"));
        }
        if (request.Owner is not null && request.Owner.Length > 120)
        {
            return ValueTask.FromResult(RestCrudValidationResult.Failure(RestCrudValidationFailureKind.Validation, "validation.max_length", "Owner"));
        }
        if (request.Note is not null && request.Note.Length > 1000)
        {
            return ValueTask.FromResult(RestCrudValidationResult.Failure(RestCrudValidationFailureKind.Validation, "validation.max_length", "Note"));
        }
        return ValueTask.FromResult(RestCrudValidationResult.Valid);
    }
}

public sealed class LeadDefaultCreateMutator
    : IRestCreateMutator<Lead, CreateLeadRequest>
{
    private readonly TelegramOperationsAdminDbContext _db;

    public LeadDefaultCreateMutator(TelegramOperationsAdminDbContext db)
    {
        _db = db ?? throw new ArgumentNullException(nameof(db));
    }

    public Task<Lead> MutateAsync(
        CreateLeadRequest request,
        RestCrudMutationContext context,
        CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);
        ArgumentNullException.ThrowIfNull(context);
        cancellationToken.ThrowIfCancellationRequested();
        var entity = new Lead
        {
            Id = Guid.NewGuid(),
            SubscriberId = request.SubscriberId,
            Subject = request.Subject,
            StatusId = request.StatusId,
            Owner = request.Owner,
            CreatedAt = request.CreatedAt,
            Note = request.Note,
            CreationTime = DateTime.UtcNow,
            CreatorId = context.CurrentUserId,
            CreatorPositionId = context.CurrentAuditPositionId,
            IsDeleted = false,
            SubjectSearch = NormalizeSearchValue(request.Subject),
            OwnerSearch = NormalizeSearchValue(request.Owner),
            NoteSearch = NormalizeSearchValue(request.Note),
        };
        _db.Leads.Add(entity);
        return Task.FromResult(entity);
    }

    private static string NormalizeSearchValue(string? value)
    {
        return value?.Trim().ToUpperInvariant() ?? string.Empty;
    }
}

public sealed class LeadDefaultUpdateMutator
    : IRestUpdateMutator<Lead, UpdateLeadRequest>
{
    public LeadDefaultUpdateMutator(TelegramOperationsAdminDbContext db)
    {
        ArgumentNullException.ThrowIfNull(db);
    }

    public Task<Lead> MutateAsync(
        Lead entity,
        UpdateLeadRequest request,
        RestCrudMutationContext context,
        CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(entity);
        ArgumentNullException.ThrowIfNull(request);
        ArgumentNullException.ThrowIfNull(context);
        cancellationToken.ThrowIfCancellationRequested();
        entity.SubscriberId = request.SubscriberId;
        entity.Subject = request.Subject;
        entity.StatusId = request.StatusId;
        entity.Owner = request.Owner;
        entity.CreatedAt = request.CreatedAt;
        entity.Note = request.Note;
        entity.SubjectSearch = NormalizeSearchValue(request.Subject);
        entity.OwnerSearch = NormalizeSearchValue(request.Owner);
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

public sealed class LeadDefaultDeleteMutator
    : IRestDeleteMutator<Lead>
{
    private readonly TelegramOperationsAdminDbContext _db;

    public LeadDefaultDeleteMutator(TelegramOperationsAdminDbContext db)
    {
        _db = db ?? throw new ArgumentNullException(nameof(db));
    }

    public Task MutateAsync(
        Lead entity,
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
