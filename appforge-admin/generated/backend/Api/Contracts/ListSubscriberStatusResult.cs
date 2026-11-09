#nullable enable

namespace Demo.TelegramOperations.Api.Contracts;

public sealed class ListSubscriberStatusResult
{
    public IReadOnlyList<SubscriberStatusDto> Items { get; set; } = Array.Empty<SubscriberStatusDto>();

    public int TotalCount { get; set; }

    public int Page { get; set; }

    public int PageSize { get; set; }
}
