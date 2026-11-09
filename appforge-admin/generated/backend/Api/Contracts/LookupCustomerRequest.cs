#nullable enable

namespace Demo.BusinessOperations.Api.Contracts;

public sealed class LookupCustomerRequest
{
    public string? Query { get; set; }
    public int Take { get; set; } = 10;
}
