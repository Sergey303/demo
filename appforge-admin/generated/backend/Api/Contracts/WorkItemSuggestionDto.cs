#nullable enable

namespace Demo.BusinessOperations.Api.Contracts;

public sealed class WorkItemSuggestionDto
{
    public string Value { get; set; } = string.Empty;

    public string Label { get; set; } = string.Empty;
}
