namespace Demo.TelegramOperations.Api.Contracts;

public static class SubscriberApiErrorCodes
{
    public const string NotFound = "subscriber.not_found";
    public const string ValidationFailed = "subscriber.validation_failed";
    public const string IdempotencyConflict = "subscriber.idempotency_conflict";
    public const string IdempotencyKeyRequired = "subscriber.idempotency_key_required";
    public const string IdempotencyKeyInvalid = "subscriber.idempotency_key_invalid";
}
