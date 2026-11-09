#nullable enable

namespace Demo.BusinessOperations.Api.Contracts;

public sealed class ListServiceRequestResult
{
    public IReadOnlyList<ServiceRequestDto> Items { get; set; } = Array.Empty<ServiceRequestDto>();

    public int TotalCount { get; set; }

    public int Page { get; set; }

    public int PageSize { get; set; }
}
