#nullable enable

namespace Demo.TelegramOperations.Api.Contracts;

public sealed class SubscriberDto
{
    public Guid Id { get; set; }
    public string Handle { get; set; } = string.Empty;
    public string DisplayName { get; set; } = string.Empty;
    public Guid StatusId { get; set; }
    public DateTime JoinedAt { get; set; }
    public string? Note { get; set; }
    public string? StatusCode { get; set; }
    public string? StatusName { get; set; }
}
