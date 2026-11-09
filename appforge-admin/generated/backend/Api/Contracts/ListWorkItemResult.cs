#nullable enable

namespace Demo.BusinessOperations.Api.Contracts;

public sealed class ListWorkItemResult
{
    public IReadOnlyList<WorkItemDto> Items { get; set; } = Array.Empty<WorkItemDto>();

    public int TotalCount { get; set; }

    public int Page { get; set; }

    public int PageSize { get; set; }
}
