#nullable enable

namespace Demo.TelegramOperations.Api.Customization;

public sealed record RestCrudMutationContext(
    Guid? CurrentUserId,
    Guid? CurrentAuditPositionId);

public enum RestCrudValidationFailureKind
{
    Validation = 0,
    Forbidden = 1,
    NotFound = 2,
    Conflict = 3,
}

public sealed record RestCrudValidationResult(
    bool IsValid,
    RestCrudValidationFailureKind? FailureKind,
    string? Code,
    string? Target,
    bool Retryable)
{
    public static RestCrudValidationResult Valid { get; } =
        new(true, null, null, null, false);

    public static RestCrudValidationResult Failure(
        RestCrudValidationFailureKind kind,
        string code,
        string? target = null,
        bool retryable = false)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(code);
        return new RestCrudValidationResult(false, kind, code, target, retryable);
    }
}

public interface IRestCreateValidator<TEntity, in TRequest>
{
    ValueTask<RestCrudValidationResult> ValidateAsync(
        TRequest request,
        RestCrudMutationContext context,
        CancellationToken cancellationToken);
}

public interface IRestUpdateValidator<TEntity, in TRequest>
{
    ValueTask<RestCrudValidationResult> ValidateAsync(
        TEntity entity,
        TRequest request,
        RestCrudMutationContext context,
        CancellationToken cancellationToken);
}

public interface IRestDeleteValidator<TEntity>
{
    ValueTask<RestCrudValidationResult> ValidateAsync(
        TEntity entity,
        RestCrudMutationContext context,
        CancellationToken cancellationToken);
}

public interface IRestCreateMutator<TEntity, in TRequest>
{
    Task<TEntity> MutateAsync(
        TRequest request,
        RestCrudMutationContext context,
        CancellationToken cancellationToken);
}

public interface IRestUpdateMutator<TEntity, in TRequest>
{
    Task<TEntity> MutateAsync(
        TEntity entity,
        TRequest request,
        RestCrudMutationContext context,
        CancellationToken cancellationToken);
}

public interface IRestDeleteMutator<TEntity>
{
    Task MutateAsync(
        TEntity entity,
        RestCrudMutationContext context,
        CancellationToken cancellationToken);
}
