#nullable enable

namespace Demo.BusinessOperations.Api.Contracts;

public sealed class LookupWorkItemRequest
{
    public string? Query { get; set; }
    public int Take { get; set; } = 10;
}
