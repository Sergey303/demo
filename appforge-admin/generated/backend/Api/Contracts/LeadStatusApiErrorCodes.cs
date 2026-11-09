namespace Demo.TelegramOperations.Api.Contracts;

public static class LeadStatusApiErrorCodes
{
    public const string NotFound = "lead.status.not_found";
    public const string ValidationFailed = "lead.status.validation_failed";
    public const string IdempotencyConflict = "lead.status.idempotency_conflict";
    public const string IdempotencyKeyRequired = "lead.status.idempotency_key_required";
    public const string IdempotencyKeyInvalid = "lead.status.idempotency_key_invalid";
}
