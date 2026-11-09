#nullable enable

using Demo.BusinessOperations;
using Demo.BusinessOperations.Api.Contracts;
using Demo.BusinessOperations.Persistence;

namespace Demo.BusinessOperations.Api.Customization;

public sealed class RoleStandardCreateValidator
    : IRestCreateValidator<Role, CreateRoleRequest>
{
    public ValueTask<RestCrudValidationResult> ValidateAsync(
        CreateRoleRequest request,
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
        if (request.Code.Length > 128)
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

public sealed class RoleStandardUpdateValidator
    : IRestUpdateValidator<Role, UpdateRoleRequest>
{
    public ValueTask<RestCrudValidationResult> ValidateAsync(
        Role entity,
        UpdateRoleRequest request,
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
        if (request.Code.Length > 128)
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

public sealed class RoleDefaultCreateMutator
    : IRestCreateMutator<Role, CreateRoleRequest>
{
    private readonly BusinessOperationsAdminDbContext _db;

    public RoleDefaultCreateMutator(BusinessOperationsAdminDbContext db)
    {
        _db = db ?? throw new ArgumentNullException(nameof(db));
    }

    public Task<Role> MutateAsync(
        CreateRoleRequest request,
        RestCrudMutationContext context,
        CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);
        ArgumentNullException.ThrowIfNull(context);
        cancellationToken.ThrowIfCancellationRequested();
        var entity = new Role
        {
            Id = Guid.NewGuid(),
            Code = request.Code,
            Name = request.Name,
        };
        _db.Roles.Add(entity);
        return Task.FromResult(entity);
    }

    private static string NormalizeSearchValue(string? value)
    {
        return value?.Trim().ToUpperInvariant() ?? string.Empty;
    }
}

public sealed class RoleDefaultUpdateMutator
    : IRestUpdateMutator<Role, UpdateRoleRequest>
{
    public RoleDefaultUpdateMutator(BusinessOperationsAdminDbContext db)
    {
        ArgumentNullException.ThrowIfNull(db);
    }

    public Task<Role> MutateAsync(
        Role entity,
        UpdateRoleRequest request,
        RestCrudMutationContext context,
        CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(entity);
        ArgumentNullException.ThrowIfNull(request);
        ArgumentNullException.ThrowIfNull(context);
        cancellationToken.ThrowIfCancellationRequested();
        entity.Code = request.Code;
        entity.Name = request.Name;
        return Task.FromResult(entity);
    }

    private static string NormalizeSearchValue(string? value)
    {
        return value?.Trim().ToUpperInvariant() ?? string.Empty;
    }
}

public sealed class RoleDefaultDeleteMutator
    : IRestDeleteMutator<Role>
{
    private readonly BusinessOperationsAdminDbContext _db;

    public RoleDefaultDeleteMutator(BusinessOperationsAdminDbContext db)
    {
        _db = db ?? throw new ArgumentNullException(nameof(db));
    }

    public Task MutateAsync(
        Role entity,
        RestCrudMutationContext context,
        CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(entity);
        ArgumentNullException.ThrowIfNull(context);
        cancellationToken.ThrowIfCancellationRequested();
        _db.Roles.Remove(entity);
        return Task.CompletedTask;
    }
}
