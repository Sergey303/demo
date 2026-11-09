#nullable enable

namespace Demo.TelegramOperations.Api.Contracts;

public sealed class ListLeadStatusResult
{
    public IReadOnlyList<LeadStatusDto> Items { get; set; } = Array.Empty<LeadStatusDto>();

    public int TotalCount { get; set; }

    public int Page { get; set; }

    public int PageSize { get; set; }
}
