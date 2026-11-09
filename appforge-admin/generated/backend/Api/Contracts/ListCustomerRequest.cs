#nullable enable

namespace Demo.BusinessOperations.Api.Contracts;

public sealed class ListCustomerRequest
{
    public int Page { get; set; } = 1;

    public int PageSize { get; set; } = 10;

    public List<ListCustomerFilter> Filters { get; set; } = new();

    public List<ListCustomerSort> Sort { get; set; } = new();
}

public sealed class ListCustomerFilter
{
    public string Field { get; set; } = string.Empty;

    public string Operator { get; set; } = "contains";

    public string? Value { get; set; }

    public List<string> Values { get; set; } = new();
}

public sealed class ListCustomerSort
{
    public string Field { get; set; } = string.Empty;

    public string Direction { get; set; } = "asc";
}
