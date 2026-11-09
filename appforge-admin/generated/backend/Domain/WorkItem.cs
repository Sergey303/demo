#nullable enable

namespace Demo.BusinessOperations;

public sealed class WorkItem
{
    public Guid Id { get; set; }
    public Guid ServiceRequestId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? Assignee { get; set; }
    public string? Status { get; set; }
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
    public string TitleSearch { get; set; } = string.Empty;
    public string AssigneeSearch { get; set; } = string.Empty;
    public string StatusSearch { get; set; } = string.Empty;
    public string NoteSearch { get; set; } = string.Empty;
    public ServiceRequest ServiceRequest { get; set; } = null!;
}
