#nullable enable

namespace Demo.TelegramOperations.Api.Contracts;

public sealed class ListSubscriberStatusRequest
{
    public int Page { get; set; } = 1;

    public int PageSize { get; set; } = 10;

    public List<ListSubscriberStatusFilter> Filters { get; set; } = new();

    public List<ListSubscriberStatusSort> Sort { get; set; } = new();
}

public sealed class ListSubscriberStatusFilter
{
    public string Field { get; set; } = string.Empty;

    public string Operator { get; set; } = "contains";

    public string? Value { get; set; }

    public List<string> Values { get; set; } = new();
}

public sealed class ListSubscriberStatusSort
{
    public string Field { get; set; } = string.Empty;

    public string Direction { get; set; } = "asc";
}
