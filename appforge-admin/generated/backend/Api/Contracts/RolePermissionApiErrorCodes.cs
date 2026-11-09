namespace Demo.TelegramOperations.Api.Contracts;

public static class RolePermissionApiErrorCodes
{
    public const string NotFound = "role.permission.not_found";
    public const string ValidationFailed = "role.permission.validation_failed";
    public const string IdempotencyConflict = "role.permission.idempotency_conflict";
    public const string IdempotencyKeyRequired = "role.permission.idempotency_key_required";
    public const string IdempotencyKeyInvalid = "role.permission.idempotency_key_invalid";
}
