#nullable enable

using Demo.TelegramOperations;
using Demo.TelegramOperations.Api.Contracts;
using Demo.TelegramOperations.Persistence;

namespace Demo.TelegramOperations.Api.Customization;

public sealed class CampaignStandardCreateValidator
    : IRestCreateValidator<Campaign, CreateCampaignRequest>
{
    public ValueTask<RestCrudValidationResult> ValidateAsync(
        CreateCampaignRequest request,
        RestCrudMutationContext context,
        CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);
        ArgumentNullException.ThrowIfNull(context);
        cancellationToken.ThrowIfCancellationRequested();
        if (string.IsNullOrWhiteSpace(request.Name))
        {
            return ValueTask.FromResult(RestCrudValidationResult.Failure(RestCrudValidationFailureKind.Validation, "validation.required", "Name"));
        }
        if (request.Name.Length > 160)
        {
            return ValueTask.FromResult(RestCrudValidationResult.Failure(RestCrudValidationFailureKind.Validation, "validation.max_length", "Name"));
        }
        if (string.IsNullOrWhiteSpace(request.AudienceDescription))
        {
            return ValueTask.FromResult(RestCrudValidationResult.Failure(RestCrudValidationFailureKind.Validation, "validation.required", "AudienceDescription"));
        }
        if (request.AudienceDescription.Length > 300)
        {
            return ValueTask.FromResult(RestCrudValidationResult.Failure(RestCrudValidationFailureKind.Validation, "validation.max_length", "AudienceDescription"));
        }
        if (string.IsNullOrWhiteSpace(request.MessageTemplate))
        {
            return ValueTask.FromResult(RestCrudValidationResult.Failure(RestCrudValidationFailureKind.Validation, "validation.required", "MessageTemplate"));
        }
        if (request.MessageTemplate.Length > 2000)
        {
            return ValueTask.FromResult(RestCrudValidationResult.Failure(RestCrudValidationFailureKind.Validation, "validation.max_length", "MessageTemplate"));
        }
        if (request.StatusId == Guid.Empty)
        {
            return ValueTask.FromResult(RestCrudValidationResult.Failure(RestCrudValidationFailureKind.Validation, "validation.required", "StatusId"));
        }
        if (request.Note is not null && request.Note.Length > 500)
        {
            return ValueTask.FromResult(RestCrudValidationResult.Failure(RestCrudValidationFailureKind.Validation, "validation.max_length", "Note"));
        }
        return ValueTask.FromResult(RestCrudValidationResult.Valid);
    }
}

public sealed class CampaignStandardUpdateValidator
    : IRestUpdateValidator<Campaign, UpdateCampaignRequest>
{
    public ValueTask<RestCrudValidationResult> ValidateAsync(
        Campaign entity,
        UpdateCampaignRequest request,
        RestCrudMutationContext context,
        CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(entity);
        ArgumentNullException.ThrowIfNull(request);
        ArgumentNullException.ThrowIfNull(context);
        cancellationToken.ThrowIfCancellationRequested();
        if (string.IsNullOrWhiteSpace(request.Name))
        {
            return ValueTask.FromResult(RestCrudValidationResult.Failure(RestCrudValidationFailureKind.Validation, "validation.required", "Name"));
        }
        if (request.Name.Length > 160)
        {
            return ValueTask.FromResult(RestCrudValidationResult.Failure(RestCrudValidationFailureKind.Validation, "validation.max_length", "Name"));
        }
        if (string.IsNullOrWhiteSpace(request.AudienceDescription))
        {
            return ValueTask.FromResult(RestCrudValidationResult.Failure(RestCrudValidationFailureKind.Validation, "validation.required", "AudienceDescription"));
        }
        if (request.AudienceDescription.Length > 300)
        {
            return ValueTask.FromResult(RestCrudValidationResult.Failure(RestCrudValidationFailureKind.Validation, "validation.max_length", "AudienceDescription"));
        }
        if (string.IsNullOrWhiteSpace(request.MessageTemplate))
        {
            return ValueTask.FromResult(RestCrudValidationResult.Failure(RestCrudValidationFailureKind.Validation, "validation.required", "MessageTemplate"));
        }
        if (request.MessageTemplate.Length > 2000)
        {
            return ValueTask.FromResult(RestCrudValidationResult.Failure(RestCrudValidationFailureKind.Validation, "validation.max_length", "MessageTemplate"));
        }
        if (request.StatusId == Guid.Empty)
        {
            return ValueTask.FromResult(RestCrudValidationResult.Failure(RestCrudValidationFailureKind.Validation, "validation.required", "StatusId"));
        }
        if (request.Note is not null && request.Note.Length > 500)
        {
            return ValueTask.FromResult(RestCrudValidationResult.Failure(RestCrudValidationFailureKind.Validation, "validation.max_length", "Note"));
        }
        return ValueTask.FromResult(RestCrudValidationResult.Valid);
    }
}

public sealed class CampaignDefaultCreateMutator
    : IRestCreateMutator<Campaign, CreateCampaignRequest>
{
    private readonly TelegramOperationsAdminDbContext _db;

    public CampaignDefaultCreateMutator(TelegramOperationsAdminDbContext db)
    {
        _db = db ?? throw new ArgumentNullException(nameof(db));
    }

    public Task<Campaign> MutateAsync(
        CreateCampaignRequest request,
        RestCrudMutationContext context,
        CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);
        ArgumentNullException.ThrowIfNull(context);
        cancellationToken.ThrowIfCancellationRequested();
        var entity = new Campaign
        {
            Id = Guid.NewGuid(),
            Name = request.Name,
            AudienceDescription = request.AudienceDescription,
            MessageTemplate = request.MessageTemplate,
            StatusId = request.StatusId,
            CreatedAt = request.CreatedAt,
            Note = request.Note,
            CreationTime = DateTime.UtcNow,
            CreatorId = context.CurrentUserId,
            CreatorPositionId = context.CurrentAuditPositionId,
            IsDeleted = false,
            NameSearch = NormalizeSearchValue(request.Name),
            AudienceDescriptionSearch = NormalizeSearchValue(request.AudienceDescription),
            MessageTemplateSearch = NormalizeSearchValue(request.MessageTemplate),
            NoteSearch = NormalizeSearchValue(request.Note),
        };
        _db.Campaigns.Add(entity);
        return Task.FromResult(entity);
    }

    private static string NormalizeSearchValue(string? value)
    {
        return value?.Trim().ToUpperInvariant() ?? string.Empty;
    }
}

public sealed class CampaignDefaultUpdateMutator
    : IRestUpdateMutator<Campaign, UpdateCampaignRequest>
{
    public CampaignDefaultUpdateMutator(TelegramOperationsAdminDbContext db)
    {
        ArgumentNullException.ThrowIfNull(db);
    }

    public Task<Campaign> MutateAsync(
        Campaign entity,
        UpdateCampaignRequest request,
        RestCrudMutationContext context,
        CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(entity);
        ArgumentNullException.ThrowIfNull(request);
        ArgumentNullException.ThrowIfNull(context);
        cancellationToken.ThrowIfCancellationRequested();
        entity.Name = request.Name;
        entity.AudienceDescription = request.AudienceDescription;
        entity.MessageTemplate = request.MessageTemplate;
        entity.StatusId = request.StatusId;
        entity.CreatedAt = request.CreatedAt;
        entity.Note = request.Note;
        entity.NameSearch = NormalizeSearchValue(request.Name);
        entity.AudienceDescriptionSearch = NormalizeSearchValue(request.AudienceDescription);
        entity.MessageTemplateSearch = NormalizeSearchValue(request.MessageTemplate);
        entity.NoteSearch = NormalizeSearchValue(request.Note);
        entity.LastModificationTime = DateTime.UtcNow;
        entity.LastModifierId = context.CurrentUserId;
        entity.LastModifierPositionId = context.CurrentAuditPositionId;
        return Task.FromResult(entity);
    }

    private static string NormalizeSearchValue(string? value)
    {
        return value?.Trim().ToUpperInvariant() ?? string.Empty;
    }
}

public sealed class CampaignDefaultDeleteMutator
    : IRestDeleteMutator<Campaign>
{
    private readonly TelegramOperationsAdminDbContext _db;

    public CampaignDefaultDeleteMutator(TelegramOperationsAdminDbContext db)
    {
        _db = db ?? throw new ArgumentNullException(nameof(db));
    }

    public Task MutateAsync(
        Campaign entity,
        RestCrudMutationContext context,
        CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(entity);
        ArgumentNullException.ThrowIfNull(context);
        cancellationToken.ThrowIfCancellationRequested();
        entity.IsDeleted = true;
        entity.DeletionTime = DateTime.UtcNow;
        entity.DeleterId = context.CurrentUserId;
        entity.DeleterPositionId = context.CurrentAuditPositionId;
        return Task.CompletedTask;
    }
}
