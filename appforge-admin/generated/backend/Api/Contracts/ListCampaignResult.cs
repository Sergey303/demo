#nullable enable

namespace Demo.TelegramOperations.Api.Contracts;

public sealed class ListCampaignResult
{
    public IReadOnlyList<CampaignDto> Items { get; set; } = Array.Empty<CampaignDto>();

    public int TotalCount { get; set; }

    public int Page { get; set; }

    public int PageSize { get; set; }
}
