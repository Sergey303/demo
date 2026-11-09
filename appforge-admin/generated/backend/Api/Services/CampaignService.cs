#nullable enable

using Demo.TelegramOperations;
using Demo.TelegramOperations.Api.Contracts;
using Demo.TelegramOperations.Api.Customization;
using Demo.TelegramOperations.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Demo.TelegramOperations.Api.Services;

public sealed class CampaignService
{
    private const int MaxPageSize = 100;
    private const int MaxSuggestionCount = 20;
    private readonly TelegramOperationsAdminDbContext _db;
    private readonly IReadOnlyList<IRestCreateValidator<Campaign, CreateCampaignRequest>> _createValidators;
    private readonly IReadOnlyList<IRestUpdateValidator<Campaign, UpdateCampaignRequest>> _updateValidators;
    private readonly IReadOnlyList<IRestDeleteValidator<Campaign>> _deleteValidators;
    private readonly IRestCreateMutator<Campaign, CreateCampaignRequest> _createMutator;
    private readonly IRestUpdateMutator<Campaign, UpdateCampaignRequest> _updateMutator;
    private readonly IRestDeleteMutator<Campaign> _deleteMutator;

    public CampaignService(TelegramOperationsAdminDbContext db)
        : this(
            db,
            new IRestCreateValidator<Campaign, CreateCampaignRequest>[]
            {
                new CampaignStandardCreateValidator(),
            },
            new IRestUpdateValidator<Campaign, UpdateCampaignRequest>[]
            {
                new CampaignStandardUpdateValidator(),
            },
            Array.Empty<IRestDeleteValidator<Campaign>>(),
            new CampaignDefaultCreateMutator(db),
            new CampaignDefaultUpdateMutator(db),
            new CampaignDefaultDeleteMutator(db))
    {
    }

    public CampaignService(
        TelegramOperationsAdminDbContext db,
        IEnumerable<IRestCreateValidator<Campaign, CreateCampaignRequest>> createValidators,
        IEnumerable<IRestUpdateValidator<Campaign, UpdateCampaignRequest>> updateValidators,
        IEnumerable<IRestDeleteValidator<Campaign>> deleteValidators,
        IRestCreateMutator<Campaign, CreateCampaignRequest> createMutator,
        IRestUpdateMutator<Campaign, UpdateCampaignRequest> updateMutator,
        IRestDeleteMutator<Campaign> deleteMutator)
    {
        ArgumentNullException.ThrowIfNull(db);
        ArgumentNullException.ThrowIfNull(createValidators);
        ArgumentNullException.ThrowIfNull(updateValidators);
        ArgumentNullException.ThrowIfNull(deleteValidators);
        ArgumentNullException.ThrowIfNull(createMutator);
        ArgumentNullException.ThrowIfNull(updateMutator);
        ArgumentNullException.ThrowIfNull(deleteMutator);

        _db = db;
        _createValidators = createValidators.ToArray();
        _updateValidators = updateValidators.ToArray();
        _deleteValidators = deleteValidators.ToArray();
        _createMutator = createMutator;
        _updateMutator = updateMutator;
        _deleteMutator = deleteMutator;
    }

    public async Task<ListCampaignResult> ListAsync(
        ListCampaignRequest request,
        Func<IQueryable<Campaign>, IQueryable<Campaign>> authorizeQuery,
        CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);
        ArgumentNullException.ThrowIfNull(authorizeQuery);
        var page = NormalizePage(request.Page);
        var pageSize = NormalizePageSize(request.PageSize);
        IQueryable<Campaign> query = _db.Campaigns.AsNoTracking()
            .Include(item => item.Status);
        query = authorizeQuery(query);
        query = ApplyFilters(query, request.Filters);
        var totalCount = await query.CountAsync(cancellationToken);
        var entities = await ApplySort(query, request.Sort)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(cancellationToken);

        return new ListCampaignResult
        {
            Items = entities.Select(ToDto).ToList(),
            TotalCount = totalCount,
            Page = page,
            PageSize = pageSize,
        };
    }

    public async Task<Campaign?> GetAsync(
        Guid id,
        bool asNoTracking,
        CancellationToken cancellationToken)
    {
        IQueryable<Campaign> query = _db.Campaigns;
        if (asNoTracking)
        {
            query = query.AsNoTracking();
        }

        query = query
            .Include(item => item.Status);
        return await query.FirstOrDefaultAsync(item => item.Id == id, cancellationToken);
    }

    public async Task<IReadOnlyList<CampaignLookupDto>> LookupAsync(
        LookupCampaignRequest request,
        Func<IQueryable<Campaign>, IQueryable<Campaign>> authorizeQuery,
        CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);
        ArgumentNullException.ThrowIfNull(authorizeQuery);
        var normalizedQuery = NormalizeSearchValue(request.Query);
        var take = Math.Clamp(request.Take, 1, MaxSuggestionCount);
        var query = _db.Campaigns.AsNoTracking();
        query = authorizeQuery(query);
        if (normalizedQuery.Length > 0)
        {
            query = query.Where(item => item.NameSearch.Contains(normalizedQuery));
        }
        query = query.OrderBy(item => item.Name);

        return await query
            .Take(take)
            .Select(item => new CampaignLookupDto
            {
                Value = item.Id.ToString(),
                Label = item.Name,
            })
            .ToListAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<CampaignSuggestionDto>> SuggestAsync(
        string field,
        SuggestCampaignRequest request,
        Func<IQueryable<Campaign>, IQueryable<Campaign>> authorizeQuery,
        CancellationToken cancellationToken)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(field);
        ArgumentNullException.ThrowIfNull(request);
        ArgumentNullException.ThrowIfNull(authorizeQuery);
        var normalizedQuery = NormalizeSearchValue(request.Query);
        var take = Math.Clamp(request.Take, 1, MaxSuggestionCount);
        var query = _db.Campaigns.AsNoTracking();
        query = authorizeQuery(query);
        switch (NormalizeField(field))
        {
            case "name":
                return await query
                    .Where(item => item.Name != null)
                    .Where(item => normalizedQuery.Length == 0 || item.NameSearch.Contains(normalizedQuery))
                    .Select(item => item.Name!)
                    .Distinct()
                    .OrderBy(value => value)
                    .Take(take)
                    .Select(value => new CampaignSuggestionDto
                    {
                        Value = value,
                        Label = value,
                    })
                    .ToListAsync(cancellationToken);
            case "audiencedescription":
                return await query
                    .Where(item => item.AudienceDescription != null)
                    .Where(item => normalizedQuery.Length == 0 || item.AudienceDescriptionSearch.Contains(normalizedQuery))
                    .Select(item => item.AudienceDescription!)
                    .Distinct()
                    .OrderBy(value => value)
                    .Take(take)
                    .Select(value => new CampaignSuggestionDto
                    {
                        Value = value,
                        Label = value,
                    })
                    .ToListAsync(cancellationToken);
            case "messagetemplate":
                return await query
                    .Where(item => item.MessageTemplate != null)
                    .Where(item => normalizedQuery.Length == 0 || item.MessageTemplateSearch.Contains(normalizedQuery))
                    .Select(item => item.MessageTemplate!)
                    .Distinct()
                    .OrderBy(value => value)
                    .Take(take)
                    .Select(value => new CampaignSuggestionDto
                    {
                        Value = value,
                        Label = value,
                    })
                    .ToListAsync(cancellationToken);
            case "note":
                return await query
                    .Where(item => item.Note != null)
                    .Where(item => normalizedQuery.Length == 0 || item.NoteSearch.Contains(normalizedQuery))
                    .Select(item => item.Note!)
                    .Distinct()
                    .OrderBy(value => value)
                    .Take(take)
                    .Select(value => new CampaignSuggestionDto
                    {
                        Value = value,
                        Label = value,
                    })
                    .ToListAsync(cancellationToken);
            default:
                break;
        }

        return Array.Empty<CampaignSuggestionDto>();
    }

    public async Task<IReadOnlyList<CampaignOptionDto>> OptionsAsync(
        string field,
        Func<IQueryable<Campaign>, IQueryable<Campaign>> authorizeQuery,
        CancellationToken cancellationToken)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(field);
        ArgumentNullException.ThrowIfNull(authorizeQuery);
        var query = _db.Campaigns.AsNoTracking();
        query = authorizeQuery(query);
        switch (NormalizeField(field))
        {
            case "statusid":
                return await _db.Set<CampaignStatus>()
                    .AsNoTracking()
                    .OrderBy(item => item.SortOrder)
                    .Select(item => new CampaignOptionDto
                    {
                        Value = item.Id.ToString(),
                        Label = item.Name,
                    })
                    .ToListAsync(cancellationToken);
            case "statusname":
                return await _db.Set<CampaignStatus>()
                    .AsNoTracking()
                    .OrderBy(item => item.SortOrder)
                    .Select(item => new CampaignOptionDto
                    {
                        Value = item.Name,
                        Label = item.Name,
                    })
                    .ToListAsync(cancellationToken);
            case "statuscode":
                return await _db.Set<CampaignStatus>()
                    .AsNoTracking()
                    .OrderBy(item => item.SortOrder)
                    .Select(item => new CampaignOptionDto
                    {
                        Value = item.Code,
                        Label = item.Name,
                    })
                    .ToListAsync(cancellationToken);
            default:
                break;
        }

        return Array.Empty<CampaignOptionDto>();
    }

    public async Task<RestCrudValidationResult> ValidateCreateAsync(
        CreateCampaignRequest request,
        Guid? currentUserId,
        Guid? currentAuditPositionId,
        CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);
        var context = new RestCrudMutationContext(currentUserId, currentAuditPositionId);
        foreach (var validator in _createValidators)
        {
            var result = await validator.ValidateAsync(request, context, cancellationToken);
            if (!result.IsValid)
            {
                return result;
            }
        }

        return RestCrudValidationResult.Valid;
    }

    public async Task<RestCrudValidationResult> ValidateUpdateAsync(
        Campaign entity,
        UpdateCampaignRequest request,
        Guid? currentUserId,
        Guid? currentAuditPositionId,
        CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(entity);
        ArgumentNullException.ThrowIfNull(request);
        var context = new RestCrudMutationContext(currentUserId, currentAuditPositionId);
        foreach (var validator in _updateValidators)
        {
            var result = await validator.ValidateAsync(entity, request, context, cancellationToken);
            if (!result.IsValid)
            {
                return result;
            }
        }

        return RestCrudValidationResult.Valid;
    }

    public async Task<RestCrudValidationResult> ValidateDeleteAsync(
        Campaign entity,
        Guid? currentUserId,
        Guid? currentAuditPositionId,
        CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(entity);
        var context = new RestCrudMutationContext(currentUserId, currentAuditPositionId);
        foreach (var validator in _deleteValidators)
        {
            var result = await validator.ValidateAsync(entity, context, cancellationToken);
            if (!result.IsValid)
            {
                return result;
            }
        }

        return RestCrudValidationResult.Valid;
    }

    public async Task<Campaign> CreateAsync(
        CreateCampaignRequest request,
        Guid? currentUserId,
        Guid? currentAuditPositionId,
        CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);
        var context = new RestCrudMutationContext(currentUserId, currentAuditPositionId);
        var entity = await _createMutator.MutateAsync(request, context, cancellationToken);
        ArgumentNullException.ThrowIfNull(entity);
        await _db.SaveChangesAsync(cancellationToken);

        await _db.Entry(entity).Reference(item => item.Status).LoadAsync(cancellationToken);
        return entity;
    }

    public async Task<Campaign> UpdateAsync(
        Campaign entity,
        UpdateCampaignRequest request,
        Guid? currentUserId,
        Guid? currentAuditPositionId,
        CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(entity);
        ArgumentNullException.ThrowIfNull(request);
        var context = new RestCrudMutationContext(currentUserId, currentAuditPositionId);
        entity = await _updateMutator.MutateAsync(entity, request, context, cancellationToken);
        ArgumentNullException.ThrowIfNull(entity);
        await _db.SaveChangesAsync(cancellationToken);

        await _db.Entry(entity).Reference(item => item.Status).LoadAsync(cancellationToken);
        return entity;
    }

    public async Task DeleteAsync(
        Campaign entity,
        Guid? currentUserId,
        Guid? currentAuditPositionId,
        CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(entity);
        var context = new RestCrudMutationContext(currentUserId, currentAuditPositionId);
        await _deleteMutator.MutateAsync(entity, context, cancellationToken);
        await _db.SaveChangesAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<string>> GetMutationWarningsAsync(
        Campaign entity,
        CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(entity);
        return Array.Empty<string>();
    }

    public CampaignDto ToDto(Campaign entity)
    {
        ArgumentNullException.ThrowIfNull(entity);
        return new CampaignDto
        {
            Id = entity.Id,
            Name = entity.Name,
            AudienceDescription = entity.AudienceDescription,
            MessageTemplate = entity.MessageTemplate,
            StatusId = entity.StatusId,
            CreatedAt = entity.CreatedAt,
            Note = entity.Note,
            StatusCode = entity.Status?.Code,
            StatusName = entity.Status?.Name,
        };
    }

    private static IQueryable<Campaign> ApplyFilters(
        IQueryable<Campaign> query,
        IReadOnlyList<ListCampaignFilter>? filters)
    {
        if (filters is null || filters.Count == 0)
        {
            return query;
        }

        foreach (var filter in filters)
        {
            if (!HasMeaningfulFilter(filter))
            {
                continue;
            }

            var queryBeforeFilter = query;
            var filterOperator = NormalizeOperator(filter.Operator);
            var normalizedFilterValue = NormalizeSearchValue(filter.Value);
            switch (NormalizeField(filter.Field))
            {
            case "name":
                if (normalizedFilterValue.Length == 0)
                {
                    break;
                }
                query = filterOperator switch
                {
                    "equals" => query.Where(item => item.NameSearch == normalizedFilterValue),
                    "startsWith" => query.Where(item => item.NameSearch.StartsWith(normalizedFilterValue)),
                    _ => query.Where(item => item.NameSearch.Contains(normalizedFilterValue)),
                };
                break;
            case "audiencedescription":
                if (normalizedFilterValue.Length == 0)
                {
                    break;
                }
                query = filterOperator switch
                {
                    "equals" => query.Where(item => item.AudienceDescriptionSearch == normalizedFilterValue),
                    "startsWith" => query.Where(item => item.AudienceDescriptionSearch.StartsWith(normalizedFilterValue)),
                    _ => query.Where(item => item.AudienceDescriptionSearch.Contains(normalizedFilterValue)),
                };
                break;
            case "messagetemplate":
                if (normalizedFilterValue.Length == 0)
                {
                    break;
                }
                query = filterOperator switch
                {
                    "equals" => query.Where(item => item.MessageTemplateSearch == normalizedFilterValue),
                    "startsWith" => query.Where(item => item.MessageTemplateSearch.StartsWith(normalizedFilterValue)),
                    _ => query.Where(item => item.MessageTemplateSearch.Contains(normalizedFilterValue)),
                };
                break;
            case "note":
                if (normalizedFilterValue.Length == 0)
                {
                    break;
                }
                query = filterOperator switch
                {
                    "equals" => query.Where(item => item.NoteSearch == normalizedFilterValue),
                    "startsWith" => query.Where(item => item.NoteSearch.StartsWith(normalizedFilterValue)),
                    _ => query.Where(item => item.NoteSearch.Contains(normalizedFilterValue)),
                };
                break;
            case "statusname":
            {
                var lookupFilterValues = filter.Values
                    .Select(value => value.Trim())
                    .Where(value => value.Length > 0)
                    .Distinct(StringComparer.Ordinal)
                    .ToList();
                if (lookupFilterValues.Count > 0)
                {
                    query = query.Where(item => item.Status != null && lookupFilterValues.Contains(item.Status.Name));
                    break;
                }
                var lookupFilterValue = filter.Value?.Trim() ?? string.Empty;
                if (lookupFilterValue.Length == 0)
                {
                    break;
                }
                query = filterOperator switch
                {
                    "equals" => query.Where(item => item.Status != null && item.Status.Name == lookupFilterValue),
                    "startsWith" => query.Where(item => item.Status != null && item.Status.Name.StartsWith(lookupFilterValue)),
                    _ => query.Where(item => item.Status != null && item.Status.Name.Contains(lookupFilterValue)),
                };
                break;
            }
            case "statuscode":
            {
                var lookupFilterValues = filter.Values
                    .Select(value => value.Trim())
                    .Where(value => value.Length > 0)
                    .Distinct(StringComparer.Ordinal)
                    .ToList();
                if (lookupFilterValues.Count > 0)
                {
                    query = query.Where(item => item.Status != null && lookupFilterValues.Contains(item.Status.Code));
                    break;
                }
                var lookupFilterValue = filter.Value?.Trim() ?? string.Empty;
                if (lookupFilterValue.Length == 0)
                {
                    break;
                }
                query = filterOperator switch
                {
                    "equals" => query.Where(item => item.Status != null && item.Status.Code == lookupFilterValue),
                    "startsWith" => query.Where(item => item.Status != null && item.Status.Code.StartsWith(lookupFilterValue)),
                    _ => query.Where(item => item.Status != null && item.Status.Code.Contains(lookupFilterValue)),
                };
                break;
            }
            case "id":
            {
                if (Guid.TryParse(filter.Value, out var parsedGuid))
                {
                    query = query.Where(item => item.Id == parsedGuid);
                }
                break;
            }
            case "statusid":
            {
                if (Guid.TryParse(filter.Value, out var parsedGuid))
                {
                    query = query.Where(item => item.StatusId == parsedGuid);
                }
                break;
            }
            default:
                break;
            }

            if (ReferenceEquals(query, queryBeforeFilter))
            {
                return query.Where(item => false);
            }
        }

        return query;
    }

    private static IOrderedQueryable<Campaign> ApplySort(
        IQueryable<Campaign> query,
        IReadOnlyList<ListCampaignSort>? sortItems)
    {
        IOrderedQueryable<Campaign>? ordered = null;

        foreach (var sort in sortItems ?? Array.Empty<ListCampaignSort>())
        {
            if (string.IsNullOrWhiteSpace(sort.Field))
            {
                continue;
            }

            var orderedBeforeSort = ordered;
            var descending = string.Equals(sort.Direction, "desc", StringComparison.OrdinalIgnoreCase);
            switch (NormalizeField(sort.Field))
            {
            case "id":
                ordered = ordered is null
                    ? (descending ? query.OrderByDescending(item => item.Id) : query.OrderBy(item => item.Id))
                    : (descending ? ordered.ThenByDescending(item => item.Id) : ordered.ThenBy(item => item.Id));
                break;
            case "name":
                ordered = ordered is null
                    ? (descending ? query.OrderByDescending(item => item.Name) : query.OrderBy(item => item.Name))
                    : (descending ? ordered.ThenByDescending(item => item.Name) : ordered.ThenBy(item => item.Name));
                break;
            case "audiencedescription":
                ordered = ordered is null
                    ? (descending ? query.OrderByDescending(item => item.AudienceDescription) : query.OrderBy(item => item.AudienceDescription))
                    : (descending ? ordered.ThenByDescending(item => item.AudienceDescription) : ordered.ThenBy(item => item.AudienceDescription));
                break;
            case "messagetemplate":
                ordered = ordered is null
                    ? (descending ? query.OrderByDescending(item => item.MessageTemplate) : query.OrderBy(item => item.MessageTemplate))
                    : (descending ? ordered.ThenByDescending(item => item.MessageTemplate) : ordered.ThenBy(item => item.MessageTemplate));
                break;
            case "statusid":
                ordered = ordered is null
                    ? (descending ? query.OrderByDescending(item => item.StatusId) : query.OrderBy(item => item.StatusId))
                    : (descending ? ordered.ThenByDescending(item => item.StatusId) : ordered.ThenBy(item => item.StatusId));
                break;
            case "createdat":
                ordered = ordered is null
                    ? (descending ? query.OrderByDescending(item => item.CreatedAt) : query.OrderBy(item => item.CreatedAt))
                    : (descending ? ordered.ThenByDescending(item => item.CreatedAt) : ordered.ThenBy(item => item.CreatedAt));
                break;
            case "note":
                ordered = ordered is null
                    ? (descending ? query.OrderByDescending(item => item.Note) : query.OrderBy(item => item.Note))
                    : (descending ? ordered.ThenByDescending(item => item.Note) : ordered.ThenBy(item => item.Note));
                break;
            default:
                break;
            }

            if (ReferenceEquals(ordered, orderedBeforeSort))
            {
                return query.Where(item => false).OrderBy(item => 0);
            }
        }

        return ordered ?? query.OrderBy(item => item.Id);
    }

    private static int NormalizePage(int value)
    {
        return value < 1 ? 1 : value;
    }

    private static int NormalizePageSize(int value)
    {
        return Math.Clamp(value, 1, MaxPageSize);
    }

    private static bool HasMeaningfulFilter(ListCampaignFilter filter)
    {
        return !string.IsNullOrWhiteSpace(filter.Value)
            || filter.Values?.Any(value => !string.IsNullOrWhiteSpace(value)) == true;
    }

    private static string NormalizeField(string? value)
    {
        return value?.Trim().Replace("_", string.Empty, StringComparison.Ordinal).ToLowerInvariant()
            ?? string.Empty;
    }

    private static string NormalizeOperator(string? value)
    {
        var normalized = value?.Trim().Replace("_", string.Empty, StringComparison.Ordinal).ToLowerInvariant();
        return normalized switch
        {
            "equals" => "equals",
            "in" => "in",
            "startswith" => "startsWith",
            _ => "contains",
        };
    }

    private static string NormalizeSearchValue(string? value)
    {
        return value?.Trim().ToUpperInvariant() ?? string.Empty;
    }


}
