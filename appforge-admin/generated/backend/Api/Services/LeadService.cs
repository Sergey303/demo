#nullable enable

using Demo.TelegramOperations;
using Demo.TelegramOperations.Api.Contracts;
using Demo.TelegramOperations.Api.Customization;
using Demo.TelegramOperations.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Demo.TelegramOperations.Api.Services;

public sealed class LeadService
{
    private const int MaxPageSize = 100;
    private const int MaxSuggestionCount = 20;
    private readonly TelegramOperationsAdminDbContext _db;
    private readonly IReadOnlyList<IRestCreateValidator<Lead, CreateLeadRequest>> _createValidators;
    private readonly IReadOnlyList<IRestUpdateValidator<Lead, UpdateLeadRequest>> _updateValidators;
    private readonly IReadOnlyList<IRestDeleteValidator<Lead>> _deleteValidators;
    private readonly IRestCreateMutator<Lead, CreateLeadRequest> _createMutator;
    private readonly IRestUpdateMutator<Lead, UpdateLeadRequest> _updateMutator;
    private readonly IRestDeleteMutator<Lead> _deleteMutator;

    public LeadService(TelegramOperationsAdminDbContext db)
        : this(
            db,
            new IRestCreateValidator<Lead, CreateLeadRequest>[]
            {
                new LeadStandardCreateValidator(),
            },
            new IRestUpdateValidator<Lead, UpdateLeadRequest>[]
            {
                new LeadStandardUpdateValidator(),
            },
            Array.Empty<IRestDeleteValidator<Lead>>(),
            new LeadDefaultCreateMutator(db),
            new LeadDefaultUpdateMutator(db),
            new LeadDefaultDeleteMutator(db))
    {
    }

    public LeadService(
        TelegramOperationsAdminDbContext db,
        IEnumerable<IRestCreateValidator<Lead, CreateLeadRequest>> createValidators,
        IEnumerable<IRestUpdateValidator<Lead, UpdateLeadRequest>> updateValidators,
        IEnumerable<IRestDeleteValidator<Lead>> deleteValidators,
        IRestCreateMutator<Lead, CreateLeadRequest> createMutator,
        IRestUpdateMutator<Lead, UpdateLeadRequest> updateMutator,
        IRestDeleteMutator<Lead> deleteMutator)
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

    public async Task<ListLeadResult> ListAsync(
        ListLeadRequest request,
        Func<IQueryable<Lead>, IQueryable<Lead>> authorizeQuery,
        CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);
        ArgumentNullException.ThrowIfNull(authorizeQuery);
        var page = NormalizePage(request.Page);
        var pageSize = NormalizePageSize(request.PageSize);
        IQueryable<Lead> query = _db.Leads.AsNoTracking()
            .Include(item => item.Status);
        query = authorizeQuery(query);
        query = ApplyFilters(query, request.Filters);
        var totalCount = await query.CountAsync(cancellationToken);
        var entities = await ApplySort(query, request.Sort)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(cancellationToken);

        return new ListLeadResult
        {
            Items = entities.Select(ToDto).ToList(),
            TotalCount = totalCount,
            Page = page,
            PageSize = pageSize,
        };
    }

    public async Task<Lead?> GetAsync(
        Guid id,
        bool asNoTracking,
        CancellationToken cancellationToken)
    {
        IQueryable<Lead> query = _db.Leads;
        if (asNoTracking)
        {
            query = query.AsNoTracking();
        }

        query = query
            .Include(item => item.Status);
        return await query.FirstOrDefaultAsync(item => item.Id == id, cancellationToken);
    }

    public async Task<IReadOnlyList<LeadLookupDto>> LookupAsync(
        LookupLeadRequest request,
        Func<IQueryable<Lead>, IQueryable<Lead>> authorizeQuery,
        CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);
        ArgumentNullException.ThrowIfNull(authorizeQuery);
        var normalizedQuery = NormalizeSearchValue(request.Query);
        var take = Math.Clamp(request.Take, 1, MaxSuggestionCount);
        var query = _db.Leads.AsNoTracking();
        query = authorizeQuery(query);
        if (normalizedQuery.Length > 0)
        {
            query = query.Where(item => item.SubjectSearch.Contains(normalizedQuery));
        }
        query = query.OrderBy(item => item.Subject);

        return await query
            .Take(take)
            .Select(item => new LeadLookupDto
            {
                Value = item.Id.ToString(),
                Label = item.Subject,
            })
            .ToListAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<LeadSuggestionDto>> SuggestAsync(
        string field,
        SuggestLeadRequest request,
        Func<IQueryable<Lead>, IQueryable<Lead>> authorizeQuery,
        CancellationToken cancellationToken)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(field);
        ArgumentNullException.ThrowIfNull(request);
        ArgumentNullException.ThrowIfNull(authorizeQuery);
        var normalizedQuery = NormalizeSearchValue(request.Query);
        var take = Math.Clamp(request.Take, 1, MaxSuggestionCount);
        var query = _db.Leads.AsNoTracking();
        query = authorizeQuery(query);
        switch (NormalizeField(field))
        {
            case "subject":
                return await query
                    .Where(item => item.Subject != null)
                    .Where(item => normalizedQuery.Length == 0 || item.SubjectSearch.Contains(normalizedQuery))
                    .Select(item => item.Subject!)
                    .Distinct()
                    .OrderBy(value => value)
                    .Take(take)
                    .Select(value => new LeadSuggestionDto
                    {
                        Value = value,
                        Label = value,
                    })
                    .ToListAsync(cancellationToken);
            case "owner":
                return await query
                    .Where(item => item.Owner != null)
                    .Where(item => normalizedQuery.Length == 0 || item.OwnerSearch.Contains(normalizedQuery))
                    .Select(item => item.Owner!)
                    .Distinct()
                    .OrderBy(value => value)
                    .Take(take)
                    .Select(value => new LeadSuggestionDto
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
                    .Select(value => new LeadSuggestionDto
                    {
                        Value = value,
                        Label = value,
                    })
                    .ToListAsync(cancellationToken);
            default:
                break;
        }

        return Array.Empty<LeadSuggestionDto>();
    }

    public async Task<IReadOnlyList<LeadOptionDto>> OptionsAsync(
        string field,
        Func<IQueryable<Lead>, IQueryable<Lead>> authorizeQuery,
        CancellationToken cancellationToken)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(field);
        ArgumentNullException.ThrowIfNull(authorizeQuery);
        var query = _db.Leads.AsNoTracking();
        query = authorizeQuery(query);
        switch (NormalizeField(field))
        {
            case "statusid":
                return await _db.Set<LeadStatus>()
                    .AsNoTracking()
                    .OrderBy(item => item.SortOrder)
                    .Select(item => new LeadOptionDto
                    {
                        Value = item.Id.ToString(),
                        Label = item.Name,
                    })
                    .ToListAsync(cancellationToken);
            case "statusname":
                return await _db.Set<LeadStatus>()
                    .AsNoTracking()
                    .OrderBy(item => item.SortOrder)
                    .Select(item => new LeadOptionDto
                    {
                        Value = item.Name,
                        Label = item.Name,
                    })
                    .ToListAsync(cancellationToken);
            case "statuscode":
                return await _db.Set<LeadStatus>()
                    .AsNoTracking()
                    .OrderBy(item => item.SortOrder)
                    .Select(item => new LeadOptionDto
                    {
                        Value = item.Code,
                        Label = item.Name,
                    })
                    .ToListAsync(cancellationToken);
            default:
                break;
        }

        return Array.Empty<LeadOptionDto>();
    }

    public async Task<RestCrudValidationResult> ValidateCreateAsync(
        CreateLeadRequest request,
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
        Lead entity,
        UpdateLeadRequest request,
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
        Lead entity,
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

    public async Task<Lead> CreateAsync(
        CreateLeadRequest request,
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

    public async Task<Lead> UpdateAsync(
        Lead entity,
        UpdateLeadRequest request,
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
        Lead entity,
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
        Lead entity,
        CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(entity);
        return Array.Empty<string>();
    }

    public LeadDto ToDto(Lead entity)
    {
        ArgumentNullException.ThrowIfNull(entity);
        return new LeadDto
        {
            Id = entity.Id,
            SubscriberId = entity.SubscriberId,
            Subject = entity.Subject,
            StatusId = entity.StatusId,
            Owner = entity.Owner,
            CreatedAt = entity.CreatedAt,
            Note = entity.Note,
            StatusCode = entity.Status?.Code,
            StatusName = entity.Status?.Name,
        };
    }

    private static IQueryable<Lead> ApplyFilters(
        IQueryable<Lead> query,
        IReadOnlyList<ListLeadFilter>? filters)
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
            case "subject":
                if (normalizedFilterValue.Length == 0)
                {
                    break;
                }
                query = filterOperator switch
                {
                    "equals" => query.Where(item => item.SubjectSearch == normalizedFilterValue),
                    "startsWith" => query.Where(item => item.SubjectSearch.StartsWith(normalizedFilterValue)),
                    _ => query.Where(item => item.SubjectSearch.Contains(normalizedFilterValue)),
                };
                break;
            case "owner":
                if (normalizedFilterValue.Length == 0)
                {
                    break;
                }
                query = filterOperator switch
                {
                    "equals" => query.Where(item => item.OwnerSearch == normalizedFilterValue),
                    "startsWith" => query.Where(item => item.OwnerSearch.StartsWith(normalizedFilterValue)),
                    _ => query.Where(item => item.OwnerSearch.Contains(normalizedFilterValue)),
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
            case "subscriberid":
            {
                if (Guid.TryParse(filter.Value, out var parsedGuid))
                {
                    query = query.Where(item => item.SubscriberId == parsedGuid);
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

    private static IOrderedQueryable<Lead> ApplySort(
        IQueryable<Lead> query,
        IReadOnlyList<ListLeadSort>? sortItems)
    {
        IOrderedQueryable<Lead>? ordered = null;

        foreach (var sort in sortItems ?? Array.Empty<ListLeadSort>())
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
            case "subscriberid":
                ordered = ordered is null
                    ? (descending ? query.OrderByDescending(item => item.SubscriberId) : query.OrderBy(item => item.SubscriberId))
                    : (descending ? ordered.ThenByDescending(item => item.SubscriberId) : ordered.ThenBy(item => item.SubscriberId));
                break;
            case "subject":
                ordered = ordered is null
                    ? (descending ? query.OrderByDescending(item => item.Subject) : query.OrderBy(item => item.Subject))
                    : (descending ? ordered.ThenByDescending(item => item.Subject) : ordered.ThenBy(item => item.Subject));
                break;
            case "statusid":
                ordered = ordered is null
                    ? (descending ? query.OrderByDescending(item => item.StatusId) : query.OrderBy(item => item.StatusId))
                    : (descending ? ordered.ThenByDescending(item => item.StatusId) : ordered.ThenBy(item => item.StatusId));
                break;
            case "owner":
                ordered = ordered is null
                    ? (descending ? query.OrderByDescending(item => item.Owner) : query.OrderBy(item => item.Owner))
                    : (descending ? ordered.ThenByDescending(item => item.Owner) : ordered.ThenBy(item => item.Owner));
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

    private static bool HasMeaningfulFilter(ListLeadFilter filter)
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
