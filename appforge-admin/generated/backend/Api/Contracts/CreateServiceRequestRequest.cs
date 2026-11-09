#nullable enable

using System.ComponentModel.DataAnnotations;

namespace Demo.BusinessOperations.Api.Contracts;

public sealed class CreateServiceRequestRequest
{
    public Guid CustomerId { get; set; }
    [Required]
    [MaxLength(200)]
    public string Title { get; set; } = string.Empty;
    [MaxLength(24)]
    public string? Priority { get; set; }
    [MaxLength(1000)]
    public string? Description { get; set; }
}
