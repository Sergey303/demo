#nullable enable

namespace Demo.BusinessOperations.Api.Contracts;

public sealed class ServiceRequestDto
{
    public Guid Id { get; set; }
    public Guid CustomerId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? Priority { get; set; }
    public string? Description { get; set; }
}
