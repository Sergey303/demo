#nullable enable

namespace Demo.TelegramOperations.Api.Contracts;

public sealed class ListSubscriberResult
{
    public IReadOnlyList<SubscriberDto> Items { get; set; } = Array.Empty<SubscriberDto>();

    public int TotalCount { get; set; }

    public int Page { get; set; }

    public int PageSize { get; set; }
}
