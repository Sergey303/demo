#nullable enable

namespace Demo.TelegramOperations.Api.Contracts;

public sealed class ListCampaignStatusResult
{
    public IReadOnlyList<CampaignStatusDto> Items { get; set; } = Array.Empty<CampaignStatusDto>();

    public int TotalCount { get; set; }

    public int Page { get; set; }

    public int PageSize { get; set; }
}
