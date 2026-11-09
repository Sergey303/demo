namespace Demo.TelegramOperations.Api.Contracts;

public static class CampaignStatusApiErrorCodes
{
    public const string NotFound = "campaign.status.not_found";
    public const string ValidationFailed = "campaign.status.validation_failed";
    public const string IdempotencyConflict = "campaign.status.idempotency_conflict";
    public const string IdempotencyKeyRequired = "campaign.status.idempotency_key_required";
    public const string IdempotencyKeyInvalid = "campaign.status.idempotency_key_invalid";
}
