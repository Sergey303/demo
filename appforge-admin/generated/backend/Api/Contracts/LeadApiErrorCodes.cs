namespace Demo.TelegramOperations.Api.Contracts;

public static class LeadApiErrorCodes
{
    public const string NotFound = "lead.not_found";
    public const string ValidationFailed = "lead.validation_failed";
    public const string IdempotencyConflict = "lead.idempotency_conflict";
    public const string IdempotencyKeyRequired = "lead.idempotency_key_required";
    public const string IdempotencyKeyInvalid = "lead.idempotency_key_invalid";
}
