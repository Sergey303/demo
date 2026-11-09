#nullable enable

using System.Collections.Generic;

namespace Demo.BusinessOperations;

public sealed class Customer
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Email { get; set; }
    public string? Segment { get; set; }
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
    public string NameSearch { get; set; } = string.Empty;
    public string EmailSearch { get; set; } = string.Empty;
    public string SegmentSearch { get; set; } = string.Empty;
    public string NoteSearch { get; set; } = string.Empty;
    public ICollection<ServiceRequest> ServiceRequests { get; } = new List<ServiceRequest>();
}
