using System;

namespace Demo.TelegramOperations;

public enum LeadStatusCode
{
    New,
    Contacted,
    Qualified,
    Closed,
}

public static class LeadStatusCodes
{
    public const string New = "new";
    public const string Contacted = "contacted";
    public const string Qualified = "qualified";
    public const string Closed = "closed";

    public static LeadStatusCode FromCode(string code)
    {
        return code switch
        {
            New => LeadStatusCode.New,
            Contacted => LeadStatusCode.Contacted,
            Qualified => LeadStatusCode.Qualified,
            Closed => LeadStatusCode.Closed,
            _ => throw new ArgumentOutOfRangeException(nameof(code), code, "Unknown LeadStatus code."),
        };
    }

    public static string ToCode(LeadStatusCode value)
    {
        return value switch
        {
            LeadStatusCode.New => New,
            LeadStatusCode.Contacted => Contacted,
            LeadStatusCode.Qualified => Qualified,
            LeadStatusCode.Closed => Closed,
            _ => throw new ArgumentOutOfRangeException(nameof(value), value, "Unknown LeadStatus value."),
        };
    }
}
