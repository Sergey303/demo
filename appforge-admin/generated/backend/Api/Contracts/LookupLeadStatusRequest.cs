#nullable enable

namespace Demo.TelegramOperations.Api.Contracts;

public sealed class LookupLeadStatusRequest
{
    public string? Query { get; set; }
    public int Take { get; set; } = 10;
}
