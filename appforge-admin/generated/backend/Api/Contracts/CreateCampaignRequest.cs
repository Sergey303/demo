#nullable enable

using System.ComponentModel.DataAnnotations;

namespace Demo.TelegramOperations.Api.Contracts;

public sealed class CreateCampaignRequest
{
    [Required]
    [MaxLength(160)]
    public string Name { get; set; } = string.Empty;
    [Required]
    [MaxLength(300)]
    public string AudienceDescription { get; set; } = string.Empty;
    [Required]
    [MaxLength(2000)]
    public string MessageTemplate { get; set; } = string.Empty;
    public Guid StatusId { get; set; }
    public DateTime CreatedAt { get; set; }
    [MaxLength(500)]
    public string? Note { get; set; }
}
