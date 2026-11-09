#nullable enable

namespace Demo.TelegramOperations;

public sealed class AppUserRole
{
    public Guid Id { get; set; }
    public Guid AppUserId { get; set; }
    public Guid RoleId { get; set; }
}
