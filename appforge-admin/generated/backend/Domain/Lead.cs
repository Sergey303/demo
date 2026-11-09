#nullable enable

namespace Demo.TelegramOperations;

public sealed class Lead
{
    public Guid Id { get; set; }
    public Guid SubscriberId { get; set; }
    public string Subject { get; set; } = string.Empty;
    public Guid StatusId { get; set; }
    public string? Owner { get; set; }
    public DateTime CreatedAt { get; set; }
    public string? Note { get; set; }
    public DateTime CreationTime { get; set; }
    public Guid? CreatorId { get; set; }
    public Guid? CreatorPositionId { get; set; }
    public DateTime? LastModificationTime { get; set; }
    public Guid? LastModifierId { get; set; }
    public Guid? LastModifierPositionId { get; set; }
    public bool IsDeleted { get; set; }
    public DateTime? DeletionTime { get; set; }
    public Guid? DeleterId { get; set; }
    public Guid? DeleterPositionId { get; set; }
    public string SubjectSearch { get; set; } = string.Empty;
    public string OwnerSearch { get; set; } = string.Empty;
    public string NoteSearch { get; set; } = string.Empty;
    public Subscriber Subscriber { get; set; } = null!;
    public LeadStatus Status { get; set; } = null!;
}
