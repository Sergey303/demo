#nullable enable

namespace Demo.TelegramOperations.Api.Contracts;

public sealed class LookupLeadRequest
{
    public string? Query { get; set; }
    public int Take { get; set; } = 10;
}
