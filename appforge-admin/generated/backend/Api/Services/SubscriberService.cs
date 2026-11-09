#nullable enable

using Demo.TelegramOperations;
using Demo.TelegramOperations.Api.Contracts;
using Demo.TelegramOperations.Api.Customization;
using Demo.TelegramOperations.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Demo.TelegramOperations.Api.Services;

public sealed class SubscriberService
{
    private const int MaxPageSize = 100;
    private const int MaxSuggestionCount = 20;
    private readonly TelegramOperationsAdminDbContext _db;
    private readonly IReadOnlyList<IRestCreateValidator<Subscriber, CreateSubscriberRequest>> _createValidators;
    private readonly IReadOnlyList<IRestUpdateValidator<Subscriber, UpdateSubscriberRequest>> _updateValidators;
    private readonly IReadOnlyList<IRestDeleteValidator<Subscriber>> _deleteValidators;
    private readonly IRestCreateMutator<Subscriber, CreateSubscriberRequest> _createMutator;
    private readonly IRestUpdateMutator<Subscriber, UpdateSubscriberRequest> _updateMutator;
    private readonly IRestDeleteMutator<Subscriber> _deleteMutator;

    public SubscriberService(TelegramOperationsAdminDbContext db)
        : this(
            db,
            new IRestCreateValidator<Subscriber, CreateSubscriberRequest>[]
            {
                new SubscriberStandardCreateValidator(),
            },
            new IRestUpdateValidator<Subscriber, UpdateSubscriberRequest>[]
            {
                new SubscriberStandardUpdateValidator(),
            },
            Array.Empty<IRestDeleteValidator<Subscriber>>(),
            new SubscriberDefaultCreateMutator(db),
            new SubscriberDefaultUpdateMutator(db),
            new SubscriberDefaultDeleteMutator(db))
    {
    }

    public SubscriberService(
        TelegramOperationsAdminDbContext db,
        IEnumerable<IRestCreateValidator<Subscriber, CreateSubscriberRequest>> createValidators,
        IEnumerable<IRestUpdateValidator<Subscriber, UpdateSubscriberRequest>> updateValidators,
        IEnumerable<IRestDeleteValidator<Subscriber>> deleteValidators,
        IRestCreateMutator<Subscriber, CreateSubscriberRequest> createMutator,
        IRestUpdateMutator<Subscriber, UpdateSubscriberRequest> updateMutator,
        IRestDeleteMutator<Subscriber> deleteMutator)
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

    public async Task<ListSubscriberResult> ListAsync(
        ListSubscriberRequest request,
        Func<IQueryable<Subscriber>, IQueryable<Subscriber>> authorizeQuery,
        CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);
        ArgumentNullException.ThrowIfNull(authorizeQuery);
        var page = NormalizePage(request.Page);
        var pageSize = NormalizePageSize(request.PageSize);
        IQueryable<Subscriber> query = _db.Subscribers.AsNoTracking()
            .Include(item => item.Status);
        query = authorizeQuery(query);
        query = ApplyFilters(query, request.Filters);
        var totalCount = await query.CountAsync(cancellationToken);
        var entities = await ApplySort(query, request.Sort)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(cancellationToken);

        return new ListSubscriberResult
        {
            Items = entities.Select(ToDto).ToList(),
            TotalCount = totalCount,
            Page = page,
            PageSize = pageSize,
        };
    }

    public async Task<Subscriber?> GetAsync(
        Guid id,
        bool asNoTracking,
        CancellationToken cancellationToken)
    {
        IQueryable<Subscriber> query = _db.Subscribers;
        if (asNoTracking)
        {
            query = query.AsNoTracking();
        }

        query = query
            .Include(item => item.Status);
        return await query.FirstOrDefaultAsync(item => item.Id == id, cancellationToken);
    }

    public async Task<IReadOnlyList<SubscriberLookupDto>> LookupAsync(
        LookupSubscriberRequest request,
        Func<IQueryable<Subscriber>, IQueryable<Subscriber>> authorizeQuery,
        CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);
        ArgumentNullException.ThrowIfNull(authorizeQuery);
        var normalizedQuery = NormalizeSearchValue(request.Query);
        var take = Math.Clamp(request.Take, 1, MaxSuggestionCount);
        var query = _db.Subscribers.AsNoTracking();
        query = authorizeQuery(query);
        if (normalizedQuery.Length > 0)
        {
            query = query.Where(item => item.DisplayNameSearch.Contains(normalizedQuery));
        }
        query = query.OrderBy(item => item.DisplayName);

        return await query
            .Take(take)
            .Select(item => new SubscriberLookupDto
            {
                Value = item.Id.ToString(),
                Label = item.DisplayName,
            })
            .ToListAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<SubscriberSuggestionDto>> SuggestAsync(
        string field,
        SuggestSubscriberRequest request,
        Func<IQueryable<Subscriber>, IQueryable<Subscriber>> authorizeQuery,
        CancellationToken cancellationToken)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(field);
        ArgumentNullException.ThrowIfNull(request);
        ArgumentNullException.ThrowIfNull(authorizeQuery);
        var normalizedQuery = NormalizeSearchValue(request.Query);
        var take = Math.Clamp(request.Take, 1, MaxSuggestionCount);
        var query = _db.Subscribers.AsNoTracking();
        query = authorizeQuery(query);
        switch (NormalizeField(field))
        {
            case "handle":
                return await query
                    .Where(item => item.Handle != null)
                    .Where(item => normalizedQuery.Length == 0 || item.HandleSearch.Contains(normalizedQuery))
                    .Select(item => item.Handle!)
                    .Distinct()
                    .OrderBy(value => value)
                    .Take(take)
                    .Select(value => new SubscriberSuggestionDto
                    {
                        Value = value,
                        Label = value,
                    })
                    .ToListAsync(cancellationToken);
            case "displayname":
                return await query
                    .Where(item => item.DisplayName != null)
                    .Where(item => normalizedQuery.Length == 0 || item.DisplayNameSearch.Contains(normalizedQuery))
                    .Select(item => item.DisplayName!)
                    .Distinct()
                    .OrderBy(value => value)
                    .Take(take)
                    .Select(value => new SubscriberSuggestionDto
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
                    .Select(value => new SubscriberSuggestionDto
                    {
                        Value = value,
                        Label = value,
                    })
                    .ToListAsync(cancellationToken);
            default:
                break;
        }

        return Array.Empty<SubscriberSuggestionDto>();
    }

    public async Task<IReadOnlyList<SubscriberOptionDto>> OptionsAsync(
        string field,
        Func<IQueryable<Subscriber>, IQueryable<Subscriber>> authorizeQuery,
        CancellationToken cancellationToken)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(field);
        ArgumentNullException.ThrowIfNull(authorizeQuery);
        var query = _db.Subscribers.AsNoTracking();
        query = authorizeQuery(query);
        switch (NormalizeField(field))
        {
            case "statusid":
                return await _db.Set<SubscriberStatus>()
                    .AsNoTracking()
                    .OrderBy(item => item.SortOrder)
                    .Select(item => new SubscriberOptionDto
                    {
                        Value = item.Id.ToString(),
                        Label = item.Name,
                    })
                    .ToListAsync(cancellationToken);
            case "statusname":
                return await _db.Set<SubscriberStatus>()
                    .AsNoTracking()
                    .OrderBy(item => item.SortOrder)
                    .Select(item => new SubscriberOptionDto
                    {
                        Value = item.Name,
                        Label = item.Name,
                    })
                    .ToListAsync(cancellationToken);
            case "statuscode":
                return await _db.Set<SubscriberStatus>()
                    .AsNoTracking()
                    .OrderBy(item => item.SortOrder)
                    .Select(item => new SubscriberOptionDto
                    {
                        Value = item.Code,
                        Label = item.Name,
                    })
                    .ToListAsync(cancellationToken);
            default:
                break;
        }

        return Array.Empty<SubscriberOptionDto>();
    }

    public async Task<RestCrudValidationResult> ValidateCreateAsync(
        CreateSubscriberRequest request,
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
        Subscriber entity,
        UpdateSubscriberRequest request,
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
        Subscriber entity,
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

    public async Task<Subscriber> CreateAsync(
        CreateSubscriberRequest request,
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

    public async Task<Subscriber> UpdateAsync(
        Subscriber entity,
        UpdateSubscriberRequest request,
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
        Subscriber entity,
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
        Subscriber entity,
        CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(entity);
        return Array.Empty<string>();
    }

    public SubscriberDto ToDto(Subscriber entity)
    {
        ArgumentNullException.ThrowIfNull(entity);
        return new SubscriberDto
        {
            Id = entity.Id,
            Handle = entity.Handle,
            DisplayName = entity.DisplayName,
            StatusId = entity.StatusId,
            JoinedAt = entity.JoinedAt,
            Note = entity.Note,
            StatusCode = entity.Status?.Code,
            StatusName = entity.Status?.Name,
        };
    }

    private static IQueryable<Subscriber> ApplyFilters(
        IQueryable<Subscriber> query,
        IReadOnlyList<ListSubscriberFilter>? filters)
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
            case "handle":
                if (normalizedFilterValue.Length == 0)
                {
                    break;
                }
                query = filterOperator switch
                {
                    "equals" => query.Where(item => item.HandleSearch == normalizedFilterValue),
                    "startsWith" => query.Where(item => item.HandleSearch.StartsWith(normalizedFilterValue)),
                    _ => query.Where(item => item.HandleSearch.Contains(normalizedFilterValue)),
                };
                break;
            case "displayname":
                if (normalizedFilterValue.Length == 0)
                {
                    break;
                }
                query = filterOperator switch
                {
                    "equals" => query.Where(item => item.DisplayNameSearch == normalizedFilterValue),
                    "startsWith" => query.Where(item => item.DisplayNameSearch.StartsWith(normalizedFilterValue)),
                    _ => query.Where(item => item.DisplayNameSearch.Contains(normalizedFilterValue)),
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

    private static IOrderedQueryable<Subscriber> ApplySort(
        IQueryable<Subscriber> query,
        IReadOnlyList<ListSubscriberSort>? sortItems)
    {
        IOrderedQueryable<Subscriber>? ordered = null;

        foreach (var sort in sortItems ?? Array.Empty<ListSubscriberSort>())
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
            case "handle":
                ordered = ordered is null
                    ? (descending ? query.OrderByDescending(item => item.Handle) : query.OrderBy(item => item.Handle))
                    : (descending ? ordered.ThenByDescending(item => item.Handle) : ordered.ThenBy(item => item.Handle));
                break;
            case "displayname":
                ordered = ordered is null
                    ? (descending ? query.OrderByDescending(item => item.DisplayName) : query.OrderBy(item => item.DisplayName))
                    : (descending ? ordered.ThenByDescending(item => item.DisplayName) : ordered.ThenBy(item => item.DisplayName));
                break;
            case "statusid":
                ordered = ordered is null
                    ? (descending ? query.OrderByDescending(item => item.StatusId) : query.OrderBy(item => item.StatusId))
                    : (descending ? ordered.ThenByDescending(item => item.StatusId) : ordered.ThenBy(item => item.StatusId));
                break;
            case "joinedat":
                ordered = ordered is null
                    ? (descending ? query.OrderByDescending(item => item.JoinedAt) : query.OrderBy(item => item.JoinedAt))
                    : (descending ? ordered.ThenByDescending(item => item.JoinedAt) : ordered.ThenBy(item => item.JoinedAt));
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

    private static bool HasMeaningfulFilter(ListSubscriberFilter filter)
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
