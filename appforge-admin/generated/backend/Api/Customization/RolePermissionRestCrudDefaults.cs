#nullable enable

using Demo.TelegramOperations;
using Demo.TelegramOperations.Api.Contracts;
using Demo.TelegramOperations.Persistence;

namespace Demo.TelegramOperations.Api.Customization;

public sealed class RolePermissionStandardCreateValidator
    : IRestCreateValidator<RolePermission, CreateRolePermissionRequest>
{
    public ValueTask<RestCrudValidationResult> ValidateAsync(
        CreateRolePermissionRequest request,
        RestCrudMutationContext context,
        CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);
        ArgumentNullException.ThrowIfNull(context);
        cancellationToken.ThrowIfCancellationRequested();
        if (request.RoleId == Guid.Empty)
        {
            return ValueTask.FromResult(RestCrudValidationResult.Failure(RestCrudValidationFailureKind.Validation, "validation.required", "RoleId"));
        }
        if (request.PermissionId == Guid.Empty)
        {
            return ValueTask.FromResult(RestCrudValidationResult.Failure(RestCrudValidationFailureKind.Validation, "validation.required", "PermissionId"));
        }
        return ValueTask.FromResult(RestCrudValidationResult.Valid);
    }
}

public sealed class RolePermissionStandardUpdateValidator
    : IRestUpdateValidator<RolePermission, UpdateRolePermissionRequest>
{
    public ValueTask<RestCrudValidationResult> ValidateAsync(
        RolePermission entity,
        UpdateRolePermissionRequest request,
        RestCrudMutationContext context,
        CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(entity);
        ArgumentNullException.ThrowIfNull(request);
        ArgumentNullException.ThrowIfNull(context);
        cancellationToken.ThrowIfCancellationRequested();
        if (request.RoleId == Guid.Empty)
        {
            return ValueTask.FromResult(RestCrudValidationResult.Failure(RestCrudValidationFailureKind.Validation, "validation.required", "RoleId"));
        }
        if (request.PermissionId == Guid.Empty)
        {
            return ValueTask.FromResult(RestCrudValidationResult.Failure(RestCrudValidationFailureKind.Validation, "validation.required", "PermissionId"));
        }
        return ValueTask.FromResult(RestCrudValidationResult.Valid);
    }
}

public sealed class RolePermissionDefaultCreateMutator
    : IRestCreateMutator<RolePermission, CreateRolePermissionRequest>
{
    private readonly TelegramOperationsAdminDbContext _db;

    public RolePermissionDefaultCreateMutator(TelegramOperationsAdminDbContext db)
    {
        _db = db ?? throw new ArgumentNullException(nameof(db));
    }

    public Task<RolePermission> MutateAsync(
        CreateRolePermissionRequest request,
        RestCrudMutationContext context,
        CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);
        ArgumentNullException.ThrowIfNull(context);
        cancellationToken.ThrowIfCancellationRequested();
        var entity = new RolePermission
        {
            Id = Guid.NewGuid(),
            RoleId = request.RoleId,
            PermissionId = request.PermissionId,
        };
        _db.RolePermissions.Add(entity);
        return Task.FromResult(entity);
    }

    private static string NormalizeSearchValue(string? value)
    {
        return value?.Trim().ToUpperInvariant() ?? string.Empty;
    }
}

public sealed class RolePermissionDefaultUpdateMutator
    : IRestUpdateMutator<RolePermission, UpdateRolePermissionRequest>
{
    public RolePermissionDefaultUpdateMutator(TelegramOperationsAdminDbContext db)
    {
        ArgumentNullException.ThrowIfNull(db);
    }

    public Task<RolePermission> MutateAsync(
        RolePermission entity,
        UpdateRolePermissionRequest request,
        RestCrudMutationContext context,
        CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(entity);
        ArgumentNullException.ThrowIfNull(request);
        ArgumentNullException.ThrowIfNull(context);
        cancellationToken.ThrowIfCancellationRequested();
        entity.RoleId = request.RoleId;
        entity.PermissionId = request.PermissionId;
        return Task.FromResult(entity);
    }

    private static string NormalizeSearchValue(string? value)
    {
        return value?.Trim().ToUpperInvariant() ?? string.Empty;
    }
}

public sealed class RolePermissionDefaultDeleteMutator
    : IRestDeleteMutator<RolePermission>
{
    private readonly TelegramOperationsAdminDbContext _db;

    public RolePermissionDefaultDeleteMutator(TelegramOperationsAdminDbContext db)
    {
        _db = db ?? throw new ArgumentNullException(nameof(db));
    }

    public Task MutateAsync(
        RolePermission entity,
        RestCrudMutationContext context,
        CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(entity);
        ArgumentNullException.ThrowIfNull(context);
        cancellationToken.ThrowIfCancellationRequested();
        _db.RolePermissions.Remove(entity);
        return Task.CompletedTask;
    }
}
