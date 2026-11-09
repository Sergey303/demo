#nullable enable

using System.ComponentModel.DataAnnotations;

namespace Demo.BusinessOperations.Api.Contracts;

public sealed class UpdatePermissionRequest
{
    [Required]
    [MaxLength(200)]
    public string Code { get; set; } = string.Empty;
    [Required]
    [MaxLength(200)]
    public string Name { get; set; } = string.Empty;
}
