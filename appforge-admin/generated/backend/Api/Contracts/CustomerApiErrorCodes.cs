namespace Demo.BusinessOperations.Api.Contracts;

public static class CustomerApiErrorCodes
{
    public const string NotFound = "customer.not_found";
    public const string ValidationFailed = "customer.validation_failed";
    public const string IdempotencyConflict = "customer.idempotency_conflict";
    public const string IdempotencyKeyRequired = "customer.idempotency_key_required";
    public const string IdempotencyKeyInvalid = "customer.idempotency_key_invalid";
}
