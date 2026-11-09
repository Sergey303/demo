#nullable enable

using Demo.BusinessOperations;
using Demo.BusinessOperations.Api.Contracts;
using Demo.BusinessOperations.Persistence;

namespace Demo.BusinessOperations.Api.Customization;

public sealed class CustomerStandardCreateValidator
    : IRestCreateValidator<Customer, CreateCustomerRequest>
{
    public ValueTask<RestCrudValidationResult> ValidateAsync(
        CreateCustomerRequest request,
        RestCrudMutationContext context,
        CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);
        ArgumentNullException.ThrowIfNull(context);
        cancellationToken.ThrowIfCancellationRequested();
        if (string.IsNullOrWhiteSpace(request.Name))
        {
            return ValueTask.FromResult(RestCrudValidationResult.Failure(RestCrudValidationFailureKind.Validation, "validation.required", "Name"));
        }
        if (request.Name.Length > 180)
        {
            return ValueTask.FromResult(RestCrudValidationResult.Failure(RestCrudValidationFailureKind.Validation, "validation.max_length", "Name"));
        }
        if (request.Email is not null && request.Email.Length > 180)
        {
            return ValueTask.FromResult(RestCrudValidationResult.Failure(RestCrudValidationFailureKind.Validation, "validation.max_length", "Email"));
        }
        if (request.Segment is not null && request.Segment.Length > 90)
        {
            return ValueTask.FromResult(RestCrudValidationResult.Failure(RestCrudValidationFailureKind.Validation, "validation.max_length", "Segment"));
        }
        if (request.Note is not null && request.Note.Length > 500)
        {
            return ValueTask.FromResult(RestCrudValidationResult.Failure(RestCrudValidationFailureKind.Validation, "validation.max_length", "Note"));
        }
        return ValueTask.FromResult(RestCrudValidationResult.Valid);
    }
}

public sealed class CustomerStandardUpdateValidator
    : IRestUpdateValidator<Customer, UpdateCustomerRequest>
{
    public ValueTask<RestCrudValidationResult> ValidateAsync(
        Customer entity,
        UpdateCustomerRequest request,
        RestCrudMutationContext context,
        CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(entity);
        ArgumentNullException.ThrowIfNull(request);
        ArgumentNullException.ThrowIfNull(context);
        cancellationToken.ThrowIfCancellationRequested();
        if (string.IsNullOrWhiteSpace(request.Name))
        {
            return ValueTask.FromResult(RestCrudValidationResult.Failure(RestCrudValidationFailureKind.Validation, "validation.required", "Name"));
        }
        if (request.Name.Length > 180)
        {
            return ValueTask.FromResult(RestCrudValidationResult.Failure(RestCrudValidationFailureKind.Validation, "validation.max_length", "Name"));
        }
        if (request.Email is not null && request.Email.Length > 180)
        {
            return ValueTask.FromResult(RestCrudValidationResult.Failure(RestCrudValidationFailureKind.Validation, "validation.max_length", "Email"));
        }
        if (request.Segment is not null && request.Segment.Length > 90)
        {
            return ValueTask.FromResult(RestCrudValidationResult.Failure(RestCrudValidationFailureKind.Validation, "validation.max_length", "Segment"));
        }
        if (request.Note is not null && request.Note.Length > 500)
        {
            return ValueTask.FromResult(RestCrudValidationResult.Failure(RestCrudValidationFailureKind.Validation, "validation.max_length", "Note"));
        }
        return ValueTask.FromResult(RestCrudValidationResult.Valid);
    }
}

public sealed class CustomerDefaultCreateMutator
    : IRestCreateMutator<Customer, CreateCustomerRequest>
{
    private readonly BusinessOperationsAdminDbContext _db;

    public CustomerDefaultCreateMutator(BusinessOperationsAdminDbContext db)
    {
        _db = db ?? throw new ArgumentNullException(nameof(db));
    }

    public Task<Customer> MutateAsync(
        CreateCustomerRequest request,
        RestCrudMutationContext context,
        CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);
        ArgumentNullException.ThrowIfNull(context);
        cancellationToken.ThrowIfCancellationRequested();
        var entity = new Customer
        {
            Id = Guid.NewGuid(),
            Name = request.Name,
            Email = request.Email,
            Segment = request.Segment,
            Note = request.Note,
            CreationTime = DateTime.UtcNow,
            CreatorId = context.CurrentUserId,
            CreatorPositionId = context.CurrentAuditPositionId,
            IsDeleted = false,
            NameSearch = NormalizeSearchValue(request.Name),
            EmailSearch = NormalizeSearchValue(request.Email),
            SegmentSearch = NormalizeSearchValue(request.Segment),
            NoteSearch = NormalizeSearchValue(request.Note),
        };
        _db.Customers.Add(entity);
        return Task.FromResult(entity);
    }

    private static string NormalizeSearchValue(string? value)
    {
        return value?.Trim().ToUpperInvariant() ?? string.Empty;
    }
}

public sealed class CustomerDefaultUpdateMutator
    : IRestUpdateMutator<Customer, UpdateCustomerRequest>
{
    public CustomerDefaultUpdateMutator(BusinessOperationsAdminDbContext db)
    {
        ArgumentNullException.ThrowIfNull(db);
    }

    public Task<Customer> MutateAsync(
        Customer entity,
        UpdateCustomerRequest request,
        RestCrudMutationContext context,
        CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(entity);
        ArgumentNullException.ThrowIfNull(request);
        ArgumentNullException.ThrowIfNull(context);
        cancellationToken.ThrowIfCancellationRequested();
        entity.Name = request.Name;
        entity.Email = request.Email;
        entity.Segment = request.Segment;
        entity.Note = request.Note;
        entity.NameSearch = NormalizeSearchValue(request.Name);
        entity.EmailSearch = NormalizeSearchValue(request.Email);
        entity.SegmentSearch = NormalizeSearchValue(request.Segment);
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

public sealed class CustomerDefaultDeleteMutator
    : IRestDeleteMutator<Customer>
{
    private readonly BusinessOperationsAdminDbContext _db;

    public CustomerDefaultDeleteMutator(BusinessOperationsAdminDbContext db)
    {
        _db = db ?? throw new ArgumentNullException(nameof(db));
    }

    public Task MutateAsync(
        Customer entity,
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
