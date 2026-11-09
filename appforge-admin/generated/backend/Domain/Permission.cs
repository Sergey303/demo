#nullable enable

using System.Collections.Generic;

namespace Demo.BusinessOperations;

public sealed class Permission
{
    public Guid Id { get; set; }
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public ICollection<RolePermission> RolePermissions { get; } = new List<RolePermission>();
}
