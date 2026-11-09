#nullable enable

namespace Demo.TelegramOperations.Api.Contracts;

public sealed class RolePermissionDto
{
    public Guid Id { get; set; }
    public Guid RoleId { get; set; }
    public Guid PermissionId { get; set; }
}
