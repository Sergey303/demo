using System;

namespace Demo.TelegramOperations;

public enum SubscriberStatusCode
{
    Active,
    Paused,
    Blocked,
}

public static class SubscriberStatusCodes
{
    public const string Active = "active";
    public const string Paused = "paused";
    public const string Blocked = "blocked";

    public static SubscriberStatusCode FromCode(string code)
    {
        return code switch
        {
            Active => SubscriberStatusCode.Active,
            Paused => SubscriberStatusCode.Paused,
            Blocked => SubscriberStatusCode.Blocked,
            _ => throw new ArgumentOutOfRangeException(nameof(code), code, "Unknown SubscriberStatus code."),
        };
    }

    public static string ToCode(SubscriberStatusCode value)
    {
        return value switch
        {
            SubscriberStatusCode.Active => Active,
            SubscriberStatusCode.Paused => Paused,
            SubscriberStatusCode.Blocked => Blocked,
            _ => throw new ArgumentOutOfRangeException(nameof(value), value, "Unknown SubscriberStatus value."),
        };
    }
}
