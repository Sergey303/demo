namespace Demo.BusinessOperations.Api.Contracts;

public static class RoleApiErrorCodes
{
    public const string NotFound = "role.not_found";
    public const string ValidationFailed = "role.validation_failed";
    public const string IdempotencyConflict = "role.idempotency_conflict";
    public const string IdempotencyKeyRequired = "role.idempotency_key_required";
    public const string IdempotencyKeyInvalid = "role.idempotency_key_invalid";
}
