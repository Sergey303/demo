#nullable enable

namespace Demo.TelegramOperations.Api.Contracts;

public sealed class ListLeadStatusRequest
{
    public int Page { get; set; } = 1;

    public int PageSize { get; set; } = 10;

    public List<ListLeadStatusFilter> Filters { get; set; } = new();

    public List<ListLeadStatusSort> Sort { get; set; } = new();
}

public sealed class ListLeadStatusFilter
{
    public string Field { get; set; } = string.Empty;

    public string Operator { get; set; } = "contains";

    public string? Value { get; set; }

    public List<string> Values { get; set; } = new();
}

public sealed class ListLeadStatusSort
{
    public string Field { get; set; } = string.Empty;

    public string Direction { get; set; } = "asc";
}
