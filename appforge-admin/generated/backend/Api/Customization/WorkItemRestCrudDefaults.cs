#nullable enable

using Demo.BusinessOperations;
using Demo.BusinessOperations.Api.Contracts;
using Demo.BusinessOperations.Persistence;

namespace Demo.BusinessOperations.Api.Customization;

public sealed class WorkItemStandardCreateValidator
    : IRestCreateValidator<WorkItem, CreateWorkItemRequest>
{
    public ValueTask<RestCrudValidationResult> ValidateAsync(
        CreateWorkItemRequest request,
        RestCrudMutationContext context,
        CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);
        ArgumentNullException.ThrowIfNull(context);
        cancellationToken.ThrowIfCancellationRequested();
        if (request.ServiceRequestId == Guid.Empty)
        {
            return ValueTask.FromResult(RestCrudValidationResult.Failure(RestCrudValidationFailureKind.Validation, "validation.required", "ServiceRequestId"));
        }
        if (string.IsNullOrWhiteSpace(request.Title))
        {
            return ValueTask.FromResult(RestCrudValidationResult.Failure(RestCrudValidationFailureKind.Validation, "validation.required", "Title"));
        }
        if (request.Title.Length > 200)
        {
            return ValueTask.FromResult(RestCrudValidationResult.Failure(RestCrudValidationFailureKind.Validation, "validation.max_length", "Title"));
        }
        if (request.Assignee is not null && request.Assignee.Length > 120)
        {
            return ValueTask.FromResult(RestCrudValidationResult.Failure(RestCrudValidationFailureKind.Validation, "validation.max_length", "Assignee"));
        }
        if (request.Status is not null && request.Status.Length > 36)
        {
            return ValueTask.FromResult(RestCrudValidationResult.Failure(RestCrudValidationFailureKind.Validation, "validation.max_length", "Status"));
        }
        if (request.Note is not null && request.Note.Length > 700)
        {
            return ValueTask.FromResult(RestCrudValidationResult.Failure(RestCrudValidationFailureKind.Validation, "validation.max_length", "Note"));
        }
        return ValueTask.FromResult(RestCrudValidationResult.Valid);
    }
}

public sealed class WorkItemStandardUpdateValidator
    : IRestUpdateValidator<WorkItem, UpdateWorkItemRequest>
{
    public ValueTask<RestCrudValidationResult> ValidateAsync(
        WorkItem entity,
        UpdateWorkItemRequest request,
        RestCrudMutationContext context,
        CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(entity);
        ArgumentNullException.ThrowIfNull(request);
        ArgumentNullException.ThrowIfNull(context);
        cancellationToken.ThrowIfCancellationRequested();
        if (request.ServiceRequestId == Guid.Empty)
        {
            return ValueTask.FromResult(RestCrudValidationResult.Failure(RestCrudValidationFailureKind.Validation, "validation.required", "ServiceRequestId"));
        }
        if (string.IsNullOrWhiteSpace(request.Title))
        {
            return ValueTask.FromResult(RestCrudValidationResult.Failure(RestCrudValidationFailureKind.Validation, "validation.required", "Title"));
        }
        if (request.Title.Length > 200)
        {
            return ValueTask.FromResult(RestCrudValidationResult.Failure(RestCrudValidationFailureKind.Validation, "validation.max_length", "Title"));
        }
        if (request.Assignee is not null && request.Assignee.Length > 120)
        {
            return ValueTask.FromResult(RestCrudValidationResult.Failure(RestCrudValidationFailureKind.Validation, "validation.max_length", "Assignee"));
        }
        if (request.Status is not null && request.Status.Length > 36)
        {
            return ValueTask.FromResult(RestCrudValidationResult.Failure(RestCrudValidationFailureKind.Validation, "validation.max_length", "Status"));
        }
        if (request.Note is not null && request.Note.Length > 700)
        {
            return ValueTask.FromResult(RestCrudValidationResult.Failure(RestCrudValidationFailureKind.Validation, "validation.max_length", "Note"));
        }
        return ValueTask.FromResult(RestCrudValidationResult.Valid);
    }
}

public sealed class WorkItemDefaultCreateMutator
    : IRestCreateMutator<WorkItem, CreateWorkItemRequest>
{
    private readonly BusinessOperationsAdminDbContext _db;

    public WorkItemDefaultCreateMutator(BusinessOperationsAdminDbContext db)
    {
        _db = db ?? throw new ArgumentNullException(nameof(db));
    }

    public Task<WorkItem> MutateAsync(
        CreateWorkItemRequest request,
        RestCrudMutationContext context,
        CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);
        ArgumentNullException.ThrowIfNull(context);
        cancellationToken.ThrowIfCancellationRequested();
        var entity = new WorkItem
        {
            Id = Guid.NewGuid(),
            ServiceRequestId = request.ServiceRequestId,
            Title = request.Title,
            Assignee = request.Assignee,
            Status = request.Status,
            Note = request.Note,
            CreationTime = DateTime.UtcNow,
            CreatorId = context.CurrentUserId,
            CreatorPositionId = context.CurrentAuditPositionId,
            IsDeleted = false,
            TitleSearch = NormalizeSearchValue(request.Title),
            AssigneeSearch = NormalizeSearchValue(request.Assignee),
            StatusSearch = NormalizeSearchValue(request.Status),
            NoteSearch = NormalizeSearchValue(request.Note),
        };
        _db.WorkItems.Add(entity);
        return Task.FromResult(entity);
    }

    private static string NormalizeSearchValue(string? value)
    {
        return value?.Trim().ToUpperInvariant() ?? string.Empty;
    }
}

public sealed class WorkItemDefaultUpdateMutator
    : IRestUpdateMutator<WorkItem, UpdateWorkItemRequest>
{
    public WorkItemDefaultUpdateMutator(BusinessOperationsAdminDbContext db)
    {
        ArgumentNullException.ThrowIfNull(db);
    }

    public Task<WorkItem> MutateAsync(
        WorkItem entity,
        UpdateWorkItemRequest request,
        RestCrudMutationContext context,
        CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(entity);
        ArgumentNullException.ThrowIfNull(request);
        ArgumentNullException.ThrowIfNull(context);
        cancellationToken.ThrowIfCancellationRequested();
        entity.ServiceRequestId = request.ServiceRequestId;
        entity.Title = request.Title;
        entity.Assignee = request.Assignee;
        entity.Status = request.Status;
        entity.Note = request.Note;
        entity.TitleSearch = NormalizeSearchValue(request.Title);
        entity.AssigneeSearch = NormalizeSearchValue(request.Assignee);
        entity.StatusSearch = NormalizeSearchValue(request.Status);
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

public sealed class WorkItemDefaultDeleteMutator
    : IRestDeleteMutator<WorkItem>
{
    private readonly BusinessOperationsAdminDbContext _db;

    public WorkItemDefaultDeleteMutator(BusinessOperationsAdminDbContext db)
    {
        _db = db ?? throw new ArgumentNullException(nameof(db));
    }

    public Task MutateAsync(
        WorkItem entity,
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
