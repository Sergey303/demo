#nullable enable

using System.ComponentModel.DataAnnotations;

namespace Demo.BusinessOperations.Api.Contracts;

public sealed class UpdateRolePermissionRequest
{
    public Guid RoleId { get; set; }
    public Guid PermissionId { get; set; }
}
