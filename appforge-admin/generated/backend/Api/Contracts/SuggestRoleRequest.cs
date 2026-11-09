#nullable enable

namespace Demo.BusinessOperations.Api.Contracts;

public sealed class SuggestRoleRequest
{
    public string? Query { get; set; }

    public int Take { get; set; } = 10;
}
