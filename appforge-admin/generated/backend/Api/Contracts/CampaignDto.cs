#nullable enable

namespace Demo.TelegramOperations.Api.Contracts;

public sealed class CampaignDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string AudienceDescription { get; set; } = string.Empty;
    public string MessageTemplate { get; set; } = string.Empty;
    public Guid StatusId { get; set; }
    public DateTime CreatedAt { get; set; }
    public string? Note { get; set; }
    public string? StatusCode { get; set; }
    public string? StatusName { get; set; }
}
