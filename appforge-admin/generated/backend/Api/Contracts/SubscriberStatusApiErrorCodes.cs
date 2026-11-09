namespace Demo.TelegramOperations.Api.Contracts;

public static class SubscriberStatusApiErrorCodes
{
    public const string NotFound = "subscriber.status.not_found";
    public const string ValidationFailed = "subscriber.status.validation_failed";
    public const string IdempotencyConflict = "subscriber.status.idempotency_conflict";
    public const string IdempotencyKeyRequired = "subscriber.status.idempotency_key_required";
    public const string IdempotencyKeyInvalid = "subscriber.status.idempotency_key_invalid";
}
