#nullable enable

namespace Demo.BusinessOperations.Api.Contracts;

public sealed class ListWorkItemRequest
{
    public int Page { get; set; } = 1;

    public int PageSize { get; set; } = 10;

    public List<ListWorkItemFilter> Filters { get; set; } = new();

    public List<ListWorkItemSort> Sort { get; set; } = new();
}

public sealed class ListWorkItemFilter
{
    public string Field { get; set; } = string.Empty;

    public string Operator { get; set; } = "contains";

    public string? Value { get; set; }

    public List<string> Values { get; set; } = new();
}

public sealed class ListWorkItemSort
{
    public string Field { get; set; } = string.Empty;

    public string Direction { get; set; } = "asc";
}
