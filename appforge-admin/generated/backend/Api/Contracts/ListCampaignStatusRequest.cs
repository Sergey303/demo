#nullable enable

namespace Demo.TelegramOperations.Api.Contracts;

public sealed class ListCampaignStatusRequest
{
    public int Page { get; set; } = 1;

    public int PageSize { get; set; } = 10;

    public List<ListCampaignStatusFilter> Filters { get; set; } = new();

    public List<ListCampaignStatusSort> Sort { get; set; } = new();
}

public sealed class ListCampaignStatusFilter
{
    public string Field { get; set; } = string.Empty;

    public string Operator { get; set; } = "contains";

    public string? Value { get; set; }

    public List<string> Values { get; set; } = new();
}

public sealed class ListCampaignStatusSort
{
    public string Field { get; set; } = string.Empty;

    public string Direction { get; set; } = "asc";
}
