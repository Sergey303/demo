#nullable enable

using System.ComponentModel.DataAnnotations;

namespace Demo.TelegramOperations.Api.Contracts;

public sealed class UpdateRolePermissionRequest
{
    public Guid RoleId { get; set; }
    public Guid PermissionId { get; set; }
}
