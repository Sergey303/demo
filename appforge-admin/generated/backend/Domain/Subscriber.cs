#nullable enable

using System.Collections.Generic;

namespace Demo.TelegramOperations;

public sealed class Subscriber
{
    public Guid Id { get; set; }
    public string Handle { get; set; } = string.Empty;
    public string DisplayName { get; set; } = string.Empty;
    public Guid StatusId { get; set; }
    public DateTime JoinedAt { get; set; }
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
    public string HandleSearch { get; set; } = string.Empty;
    public string DisplayNameSearch { get; set; } = string.Empty;
    public string NoteSearch { get; set; } = string.Empty;
    public SubscriberStatus Status { get; set; } = null!;
    public ICollection<Lead> Leads { get; } = new List<Lead>();
}
