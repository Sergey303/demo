#nullable enable

namespace Demo.TelegramOperations.Api.Contracts;

public sealed class LookupPermissionRequest
{
    public string? Query { get; set; }
    public int Take { get; set; } = 10;
}
