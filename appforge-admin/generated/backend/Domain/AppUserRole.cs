#nullable enable

namespace Demo.BusinessOperations;

public sealed class AppUserRole
{
    public Guid Id { get; set; }
    public Guid AppUserId { get; set; }
    public Guid RoleId { get; set; }
}
