#nullable enable

using Demo.BusinessOperations;
using Demo.BusinessOperations.Api.Contracts;
using Demo.BusinessOperations.Persistence;

namespace Demo.BusinessOperations.Api.Customization;

public sealed class ServiceRequestStandardCreateValidator
    : IRestCreateValidator<ServiceRequest, CreateServiceRequestRequest>
{
    public ValueTask<RestCrudValidationResult> ValidateAsync(
        CreateServiceRequestRequest request,
        RestCrudMutationContext context,
        CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);
        ArgumentNullException.ThrowIfNull(context);
        cancellationToken.ThrowIfCancellationRequested();
        if (request.CustomerId == Guid.Empty)
        {
            return ValueTask.FromResult(RestCrudValidationResult.Failure(RestCrudValidationFailureKind.Validation, "validation.required", "CustomerId"));
        }
        if (string.IsNullOrWhiteSpace(request.Title))
        {
            return ValueTask.FromResult(RestCrudValidationResult.Failure(RestCrudValidationFailureKind.Validation, "validation.required", "Title"));
        }
        if (request.Title.Length > 200)
        {
            return ValueTask.FromResult(RestCrudValidationResult.Failure(RestCrudValidationFailureKind.Validation, "validation.max_length", "Title"));
        }
        if (request.Priority is not null && request.Priority.Length > 24)
        {
            return ValueTask.FromResult(RestCrudValidationResult.Failure(RestCrudValidationFailureKind.Validation, "validation.max_length", "Priority"));
        }
        if (request.Description is not null && request.Description.Length > 1000)
        {
            return ValueTask.FromResult(RestCrudValidationResult.Failure(RestCrudValidationFailureKind.Validation, "validation.max_length", "Description"));
        }
        return ValueTask.FromResult(RestCrudValidationResult.Valid);
    }
}

public sealed class ServiceRequestStandardUpdateValidator
    : IRestUpdateValidator<ServiceRequest, UpdateServiceRequestRequest>
{
    public ValueTask<RestCrudValidationResult> ValidateAsync(
        ServiceRequest entity,
        UpdateServiceRequestRequest request,
        RestCrudMutationContext context,
        CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(entity);
        ArgumentNullException.ThrowIfNull(request);
        ArgumentNullException.ThrowIfNull(context);
        cancellationToken.ThrowIfCancellationRequested();
        if (request.CustomerId == Guid.Empty)
        {
            return ValueTask.FromResult(RestCrudValidationResult.Failure(RestCrudValidationFailureKind.Validation, "validation.required", "CustomerId"));
        }
        if (string.IsNullOrWhiteSpace(request.Title))
        {
            return ValueTask.FromResult(RestCrudValidationResult.Failure(RestCrudValidationFailureKind.Validation, "validation.required", "Title"));
        }
        if (request.Title.Length > 200)
        {
            return ValueTask.FromResult(RestCrudValidationResult.Failure(RestCrudValidationFailureKind.Validation, "validation.max_length", "Title"));
        }
        if (request.Priority is not null && request.Priority.Length > 24)
        {
            return ValueTask.FromResult(RestCrudValidationResult.Failure(RestCrudValidationFailureKind.Validation, "validation.max_length", "Priority"));
        }
        if (request.Description is not null && request.Description.Length > 1000)
        {
            return ValueTask.FromResult(RestCrudValidationResult.Failure(RestCrudValidationFailureKind.Validation, "validation.max_length", "Description"));
        }
        return ValueTask.FromResult(RestCrudValidationResult.Valid);
    }
}

public sealed class ServiceRequestDefaultCreateMutator
    : IRestCreateMutator<ServiceRequest, CreateServiceRequestRequest>
{
    private readonly BusinessOperationsAdminDbContext _db;

    public ServiceRequestDefaultCreateMutator(BusinessOperationsAdminDbContext db)
    {
        _db = db ?? throw new ArgumentNullException(nameof(db));
    }

    public Task<ServiceRequest> MutateAsync(
        CreateServiceRequestRequest request,
        RestCrudMutationContext context,
        CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);
        ArgumentNullException.ThrowIfNull(context);
        cancellationToken.ThrowIfCancellationRequested();
        var entity = new ServiceRequest
        {
            Id = Guid.NewGuid(),
            CustomerId = request.CustomerId,
            Title = request.Title,
            Priority = request.Priority,
            Description = request.Description,
            CreationTime = DateTime.UtcNow,
            CreatorId = context.CurrentUserId,
            CreatorPositionId = context.CurrentAuditPositionId,
            IsDeleted = false,
            TitleSearch = NormalizeSearchValue(request.Title),
            PrioritySearch = NormalizeSearchValue(request.Priority),
            DescriptionSearch = NormalizeSearchValue(request.Description),
        };
        _db.ServiceRequests.Add(entity);
        return Task.FromResult(entity);
    }

    private static string NormalizeSearchValue(string? value)
    {
        return value?.Trim().ToUpperInvariant() ?? string.Empty;
    }
}

public sealed class ServiceRequestDefaultUpdateMutator
    : IRestUpdateMutator<ServiceRequest, UpdateServiceRequestRequest>
{
    public ServiceRequestDefaultUpdateMutator(BusinessOperationsAdminDbContext db)
    {
        ArgumentNullException.ThrowIfNull(db);
    }

    public Task<ServiceRequest> MutateAsync(
        ServiceRequest entity,
        UpdateServiceRequestRequest request,
        RestCrudMutationContext context,
        CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(entity);
        ArgumentNullException.ThrowIfNull(request);
        ArgumentNullException.ThrowIfNull(context);
        cancellationToken.ThrowIfCancellationRequested();
        entity.CustomerId = request.CustomerId;
        entity.Title = request.Title;
        entity.Priority = request.Priority;
        entity.Description = request.Description;
        entity.TitleSearch = NormalizeSearchValue(request.Title);
        entity.PrioritySearch = NormalizeSearchValue(request.Priority);
        entity.DescriptionSearch = NormalizeSearchValue(request.Description);
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

public sealed class ServiceRequestDefaultDeleteMutator
    : IRestDeleteMutator<ServiceRequest>
{
    private readonly BusinessOperationsAdminDbContext _db;

    public ServiceRequestDefaultDeleteMutator(BusinessOperationsAdminDbContext db)
    {
        _db = db ?? throw new ArgumentNullException(nameof(db));
    }

    public Task MutateAsync(
        ServiceRequest entity,
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
