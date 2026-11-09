namespace Demo.TelegramOperations.Api.Contracts;

public static class CampaignApiErrorCodes
{
    public const string NotFound = "campaign.not_found";
    public const string ValidationFailed = "campaign.validation_failed";
    public const string IdempotencyConflict = "campaign.idempotency_conflict";
    public const string IdempotencyKeyRequired = "campaign.idempotency_key_required";
    public const string IdempotencyKeyInvalid = "campaign.idempotency_key_invalid";
}
