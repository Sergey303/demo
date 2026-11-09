#nullable enable

using System.ComponentModel.DataAnnotations;

namespace Demo.BusinessOperations.Api.Contracts;

public sealed class UpdateWorkItemRequest
{
    public Guid ServiceRequestId { get; set; }
    [Required]
    [MaxLength(200)]
    public string Title { get; set; } = string.Empty;
    [MaxLength(120)]
    public string? Assignee { get; set; }
    [MaxLength(36)]
    public string? Status { get; set; }
    [MaxLength(700)]
    public string? Note { get; set; }
}
