#nullable enable

namespace Demo.TelegramOperations.Api.Contracts;

public sealed class ListLeadResult
{
    public IReadOnlyList<LeadDto> Items { get; set; } = Array.Empty<LeadDto>();

    public int TotalCount { get; set; }

    public int Page { get; set; }

    public int PageSize { get; set; }
}
