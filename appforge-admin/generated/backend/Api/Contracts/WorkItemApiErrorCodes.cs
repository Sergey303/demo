namespace Demo.BusinessOperations.Api.Contracts;

public static class WorkItemApiErrorCodes
{
    public const string NotFound = "work.item.not_found";
    public const string ValidationFailed = "work.item.validation_failed";
    public const string IdempotencyConflict = "work.item.idempotency_conflict";
    public const string IdempotencyKeyRequired = "work.item.idempotency_key_required";
    public const string IdempotencyKeyInvalid = "work.item.idempotency_key_invalid";
}
