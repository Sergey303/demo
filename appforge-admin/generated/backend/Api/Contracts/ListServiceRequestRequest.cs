#nullable enable

namespace Demo.BusinessOperations.Api.Contracts;

public sealed class ListServiceRequestRequest
{
    public int Page { get; set; } = 1;

    public int PageSize { get; set; } = 10;

    public List<ListServiceRequestFilter> Filters { get; set; } = new();

    public List<ListServiceRequestSort> Sort { get; set; } = new();
}

public sealed class ListServiceRequestFilter
{
    public string Field { get; set; } = string.Empty;

    public string Operator { get; set; } = "contains";

    public string? Value { get; set; }

    public List<string> Values { get; set; } = new();
}

public sealed class ListServiceRequestSort
{
    public string Field { get; set; } = string.Empty;

    public string Direction { get; set; } = "asc";
}
