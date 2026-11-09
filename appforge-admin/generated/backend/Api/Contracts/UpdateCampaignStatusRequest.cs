#nullable enable

using System.ComponentModel.DataAnnotations;

namespace Demo.TelegramOperations.Api.Contracts;

public sealed class UpdateCampaignStatusRequest
{
    [Required]
    [MaxLength(64)]
    public string Code { get; set; } = string.Empty;
    [Required]
    [MaxLength(200)]
    public string Name { get; set; } = string.Empty;
    public int SortOrder { get; set; }
}
