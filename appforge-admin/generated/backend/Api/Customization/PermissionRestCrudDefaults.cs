#nullable enable

using Demo.BusinessOperations;
using Demo.BusinessOperations.Api.Contracts;
using Demo.BusinessOperations.Persistence;

namespace Demo.BusinessOperations.Api.Customization;

public sealed class PermissionStandardCreateValidator
    : IRestCreateValidator<Permission, CreatePermissionRequest>
{
    public ValueTask<RestCrudValidationResult> ValidateAsync(
        CreatePermissionRequest request,
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
        if (request.Code.Length > 200)
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

public sealed class PermissionStandardUpdateValidator
    : IRestUpdateValidator<Permission, UpdatePermissionRequest>
{
    public ValueTask<RestCrudValidationResult> ValidateAsync(
        Permission entity,
        UpdatePermissionRequest request,
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
        if (request.Code.Length > 200)
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

public sealed class PermissionDefaultCreateMutator
    : IRestCreateMutator<Permission, CreatePermissionRequest>
{
    private readonly BusinessOperationsAdminDbContext _db;

    public PermissionDefaultCreateMutator(BusinessOperationsAdminDbContext db)
    {
        _db = db ?? throw new ArgumentNullException(nameof(db));
    }

    public Task<Permission> MutateAsync(
        CreatePermissionRequest request,
        RestCrudMutationContext context,
        CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);
        ArgumentNullException.ThrowIfNull(context);
        cancellationToken.ThrowIfCancellationRequested();
        var entity = new Permission
        {
            Id = Guid.NewGuid(),
            Code = request.Code,
            Name = request.Name,
        };
        _db.Permissions.Add(entity);
        return Task.FromResult(entity);
    }

    private static string NormalizeSearchValue(string? value)
    {
        return value?.Trim().ToUpperInvariant() ?? string.Empty;
    }
}

public sealed class PermissionDefaultUpdateMutator
    : IRestUpdateMutator<Permission, UpdatePermissionRequest>
{
    public PermissionDefaultUpdateMutator(BusinessOperationsAdminDbContext db)
    {
        ArgumentNullException.ThrowIfNull(db);
    }

    public Task<Permission> MutateAsync(
        Permission entity,
        UpdatePermissionRequest request,
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

public sealed class PermissionDefaultDeleteMutator
    : IRestDeleteMutator<Permission>
{
    private readonly BusinessOperationsAdminDbContext _db;

    public PermissionDefaultDeleteMutator(BusinessOperationsAdminDbContext db)
    {
        _db = db ?? throw new ArgumentNullException(nameof(db));
    }

    public Task MutateAsync(
        Permission entity,
        RestCrudMutationContext context,
        CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(entity);
        ArgumentNullException.ThrowIfNull(context);
        cancellationToken.ThrowIfCancellationRequested();
        _db.Permissions.Remove(entity);
        return Task.CompletedTask;
    }
}
