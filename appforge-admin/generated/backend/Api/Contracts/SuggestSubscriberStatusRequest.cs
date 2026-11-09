#nullable enable

namespace Demo.TelegramOperations.Api.Contracts;

public sealed class SuggestSubscriberStatusRequest
{
    public string? Query { get; set; }

    public int Take { get; set; } = 10;
}
