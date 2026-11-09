#nullable enable

namespace Demo.BusinessOperations.Api.Contracts;

public sealed class LookupServiceRequestRequest
{
    public string? Query { get; set; }
    public int Take { get; set; } = 10;
}
