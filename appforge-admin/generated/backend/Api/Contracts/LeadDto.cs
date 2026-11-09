#nullable enable

namespace Demo.TelegramOperations.Api.Contracts;

public sealed class LeadDto
{
    public Guid Id { get; set; }
    public Guid SubscriberId { get; set; }
    public string Subject { get; set; } = string.Empty;
    public Guid StatusId { get; set; }
    public string? Owner { get; set; }
    public DateTime CreatedAt { get; set; }
    public string? Note { get; set; }
    public string? StatusCode { get; set; }
    public string? StatusName { get; set; }
}
