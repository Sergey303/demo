#nullable enable

namespace Demo.BusinessOperations.Api.Contracts;

public sealed class ListPermissionResult
{
    public IReadOnlyList<PermissionDto> Items { get; set; } = Array.Empty<PermissionDto>();

    public int TotalCount { get; set; }

    public int Page { get; set; }

    public int PageSize { get; set; }
}
