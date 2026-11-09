#nullable enable

namespace Demo.BusinessOperations.Api.Contracts;

public sealed class CustomerDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Email { get; set; }
    public string? Segment { get; set; }
    public string? Note { get; set; }
}
