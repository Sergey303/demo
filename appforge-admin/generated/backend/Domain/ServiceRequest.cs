#nullable enable

using System.Collections.Generic;

namespace Demo.BusinessOperations;

public sealed class ServiceRequest
{
    public Guid Id { get; set; }
    public Guid CustomerId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? Priority { get; set; }
    public string? Description { get; set; }
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
    public string PrioritySearch { get; set; } = string.Empty;
    public string DescriptionSearch { get; set; } = string.Empty;
    public Customer Customer { get; set; } = null!;
    public ICollection<WorkItem> WorkItems { get; } = new List<WorkItem>();
}
