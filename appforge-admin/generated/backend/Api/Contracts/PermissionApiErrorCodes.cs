namespace Demo.TelegramOperations.Api.Contracts;

public static class PermissionApiErrorCodes
{
    public const string NotFound = "permission.not_found";
    public const string ValidationFailed = "permission.validation_failed";
    public const string IdempotencyConflict = "permission.idempotency_conflict";
    public const string IdempotencyKeyRequired = "permission.idempotency_key_required";
    public const string IdempotencyKeyInvalid = "permission.idempotency_key_invalid";
}
