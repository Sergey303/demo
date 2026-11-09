#nullable enable

using System.ComponentModel.DataAnnotations;

namespace Demo.TelegramOperations.Api.Contracts;

public sealed class UpdateSubscriberRequest
{
    [Required]
    [MaxLength(80)]
    public string Handle { get; set; } = string.Empty;
    [Required]
    [MaxLength(200)]
    public string DisplayName { get; set; } = string.Empty;
    public Guid StatusId { get; set; }
    public DateTime JoinedAt { get; set; }
    [MaxLength(500)]
    public string? Note { get; set; }
}
