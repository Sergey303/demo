#nullable enable

namespace Demo.BusinessOperations.Api.Contracts;

public sealed class WorkItemDto
{
    public Guid Id { get; set; }
    public Guid ServiceRequestId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? Assignee { get; set; }
    public string? Status { get; set; }
    public string? Note { get; set; }
}
