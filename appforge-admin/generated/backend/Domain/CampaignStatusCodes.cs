using System;

namespace Demo.TelegramOperations;

public enum CampaignStatusCode
{
    Draft,
    Approved,
    Archived,
}

public static class CampaignStatusCodes
{
    public const string Draft = "draft";
    public const string Approved = "approved";
    public const string Archived = "archived";

    public static CampaignStatusCode FromCode(string code)
    {
        return code switch
        {
            Draft => CampaignStatusCode.Draft,
            Approved => CampaignStatusCode.Approved,
            Archived => CampaignStatusCode.Archived,
            _ => throw new ArgumentOutOfRangeException(nameof(code), code, "Unknown CampaignStatus code."),
        };
    }

    public static string ToCode(CampaignStatusCode value)
    {
        return value switch
        {
            CampaignStatusCode.Draft => Draft,
            CampaignStatusCode.Approved => Approved,
            CampaignStatusCode.Archived => Archived,
            _ => throw new ArgumentOutOfRangeException(nameof(value), value, "Unknown CampaignStatus value."),
        };
    }
}
