#nullable enable

using Demo.TelegramOperations;
using Demo.TelegramOperations.Api.Contracts;
using Demo.TelegramOperations.Persistence;

namespace Demo.TelegramOperations.Api.Customization;

public sealed class LeadStatusStandardCreateValidator
    : IRestCreateValidator<LeadStatus, CreateLeadStatusRequest>
{
    public ValueTask<RestCrudValidationResult> ValidateAsync(
        CreateLeadStatusRequest request,
        RestCrudMutationContext context,
        CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);
        ArgumentNullException.ThrowIfNull(context);
        cancellationToken.ThrowIfCancellationRequested();
        if (string.IsNullOrWhiteSpace(request.Code))
        {
            return ValueTask.FromResult(RestCrudValidationResult.Failure(RestCrudValidationFailureKind.Validation, "validation.required", "Code"));
        }
        if (request.Code.Length > 64)
        {
            return ValueTask.FromResult(RestCrudValidationResult.Failure(RestCrudValidationFailureKind.Validation, "validation.max_length", "Code"));
        }
        if (string.IsNullOrWhiteSpace(request.Name))
        {
            return ValueTask.FromResult(RestCrudValidationResult.Failure(RestCrudValidationFailureKind.Validation, "validation.required", "Name"));
        }
        if (request.Name.Length > 200)
        {
            return ValueTask.FromResult(RestCrudValidationResult.Failure(RestCrudValidationFailureKind.Validation, "validation.max_length", "Name"));
        }
        return ValueTask.FromResult(RestCrudValidationResult.Valid);
    }
}

public sealed class LeadStatusStandardUpdateValidator
    : IRestUpdateValidator<LeadStatus, UpdateLeadStatusRequest>
{
    public ValueTask<RestCrudValidationResult> ValidateAsync(
        LeadStatus entity,
        UpdateLeadStatusRequest request,
        RestCrudMutationContext context,
        CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(entity);
        ArgumentNullException.ThrowIfNull(request);
        ArgumentNullException.ThrowIfNull(context);
        cancellationToken.ThrowIfCancellationRequested();
        if (string.IsNullOrWhiteSpace(request.Code))
        {
            return ValueTask.FromResult(RestCrudValidationResult.Failure(RestCrudValidationFailureKind.Validation, "validation.required", "Code"));
        }
        if (request.Code.Length > 64)
        {
            return ValueTask.FromResult(RestCrudValidationResult.Failure(RestCrudValidationFailureKind.Validation, "validation.max_length", "Code"));
        }
        if (string.IsNullOrWhiteSpace(request.Name))
        {
            return ValueTask.FromResult(RestCrudValidationResult.Failure(RestCrudValidationFailureKind.Validation, "validation.required", "Name"));
        }
        if (request.Name.Length > 200)
        {
            return ValueTask.FromResult(RestCrudValidationResult.Failure(RestCrudValidationFailureKind.Validation, "validation.max_length", "Name"));
        }
        return ValueTask.FromResult(RestCrudValidationResult.Valid);
    }
}

public sealed class LeadStatusDefaultCreateMutator
    : IRestCreateMutator<LeadStatus, CreateLeadStatusRequest>
{
    private readonly TelegramOperationsAdminDbContext _db;

    public LeadStatusDefaultCreateMutator(TelegramOperationsAdminDbContext db)
    {
        _db = db ?? throw new ArgumentNullException(nameof(db));
    }

    public Task<LeadStatus> MutateAsync(
        CreateLeadStatusRequest request,
        RestCrudMutationContext context,
        CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);
        ArgumentNullException.ThrowIfNull(context);
        cancellationToken.ThrowIfCancellationRequested();
        var entity = new LeadStatus
        {
            Id = Guid.NewGuid(),
            Code = request.Code,
            Name = request.Name,
            SortOrder = request.SortOrder,
        };
        _db.LeadStatuses.Add(entity);
        return Task.FromResult(entity);
    }

    private static string NormalizeSearchValue(string? value)
    {
        return value?.Trim().ToUpperInvariant() ?? string.Empty;
    }
}

public sealed class LeadStatusDefaultUpdateMutator
    : IRestUpdateMutator<LeadStatus, UpdateLeadStatusRequest>
{
    public LeadStatusDefaultUpdateMutator(TelegramOperationsAdminDbContext db)
    {
        ArgumentNullException.ThrowIfNull(db);
    }

    public Task<LeadStatus> MutateAsync(
        LeadStatus entity,
        UpdateLeadStatusRequest request,
        RestCrudMutationContext context,
        CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(entity);
        ArgumentNullException.ThrowIfNull(request);
        ArgumentNullException.ThrowIfNull(context);
        cancellationToken.ThrowIfCancellationRequested();
        entity.Code = request.Code;
        entity.Name = request.Name;
        entity.SortOrder = request.SortOrder;
        return Task.FromResult(entity);
    }

    private static string NormalizeSearchValue(string? value)
    {
        return value?.Trim().ToUpperInvariant() ?? string.Empty;
    }
}

public sealed class LeadStatusDefaultDeleteMutator
    : IRestDeleteMutator<LeadStatus>
{
    private readonly TelegramOperationsAdminDbContext _db;

    public LeadStatusDefaultDeleteMutator(TelegramOperationsAdminDbContext db)
    {
        _db = db ?? throw new ArgumentNullException(nameof(db));
    }

    public Task MutateAsync(
        LeadStatus entity,
        RestCrudMutationContext context,
        CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(entity);
        ArgumentNullException.ThrowIfNull(context);
        cancellationToken.ThrowIfCancellationRequested();
        _db.LeadStatuses.Remove(entity);
        return Task.CompletedTask;
    }
}
