namespace Demo.BusinessOperations.Api.Contracts;

public static class ServiceRequestApiErrorCodes
{
    public const string NotFound = "service.request.not_found";
    public const string ValidationFailed = "service.request.validation_failed";
    public const string IdempotencyConflict = "service.request.idempotency_conflict";
    public const string IdempotencyKeyRequired = "service.request.idempotency_key_required";
    public const string IdempotencyKeyInvalid = "service.request.idempotency_key_invalid";
}
