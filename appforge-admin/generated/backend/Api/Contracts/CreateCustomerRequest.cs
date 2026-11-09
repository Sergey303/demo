#nullable enable

using System.ComponentModel.DataAnnotations;

namespace Demo.BusinessOperations.Api.Contracts;

public sealed class CreateCustomerRequest
{
    [Required]
    [MaxLength(180)]
    public string Name { get; set; } = string.Empty;
    [MaxLength(180)]
    public string? Email { get; set; }
    [MaxLength(90)]
    public string? Segment { get; set; }
    [MaxLength(500)]
    public string? Note { get; set; }
}
