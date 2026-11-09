#nullable enable

namespace AppForge.Generation;

public enum FrontendActionKind
{
    None = 0,
    WindowLocationAssign = 1,
    Download = 2,
    Upload = 3,
}

[AttributeUsage(AttributeTargets.Method, AllowMultiple = false)]
public sealed class FrontendActionAttribute(FrontendActionKind kind) : Attribute
{
    public FrontendActionKind Kind { get; } = kind;
}
