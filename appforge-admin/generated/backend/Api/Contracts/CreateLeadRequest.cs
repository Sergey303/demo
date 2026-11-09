#nullable enable

using System.ComponentModel.DataAnnotations;

namespace Demo.TelegramOperations.Api.Contracts;

public sealed class CreateLeadRequest
{
    public Guid SubscriberId { get; set; }
    [Required]
    [MaxLength(200)]
    public string Subject { get; set; } = string.Empty;
    public Guid StatusId { get; set; }
    [MaxLength(120)]
    public string? Owner { get; set; }
    public DateTime CreatedAt { get; set; }
    [MaxLength(1000)]
    public string? Note { get; set; }
}
