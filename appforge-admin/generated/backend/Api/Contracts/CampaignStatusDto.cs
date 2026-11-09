#nullable enable

namespace Demo.TelegramOperations.Api.Contracts;

public sealed class CampaignStatusDto
{
    public Guid Id { get; set; }
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public int SortOrder { get; set; }
}
