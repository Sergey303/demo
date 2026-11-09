#nullable enable

namespace Demo.TelegramOperations;

public sealed class AppForgeRestMutationReceipt
{
    public Guid Id { get; set; }
    public string SubjectKey { get; set; } = string.Empty;
    public string EndpointKey { get; set; } = string.Empty;
    public string IdempotencyKey { get; set; } = string.Empty;
    public string RequestFingerprint { get; set; } = string.Empty;
    public string? ResponseJson { get; set; }
    public DateTime CreatedAtUtc { get; set; }
}
