namespace AppForge.Generation;

[AttributeUsage(AttributeTargets.Method, AllowMultiple = true)]
public sealed class ExternalInvalidatesApiEndpointAttribute(string endpointKey) : Attribute
{
    public string EndpointKey { get; } = endpointKey;
}
