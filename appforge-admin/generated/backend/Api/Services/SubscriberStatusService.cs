#nullable enable

using Demo.TelegramOperations;
using Demo.TelegramOperations.Api.Contracts;
using Demo.TelegramOperations.Api.Customization;
using Demo.TelegramOperations.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Demo.TelegramOperations.Api.Services;

public sealed class SubscriberStatusService
{
    private const int MaxPageSize = 100;
    private const int MaxSuggestionCount = 20;
    private readonly TelegramOperationsAdminDbContext _db;
    private readonly IReadOnlyList<IRestCreateValidator<SubscriberStatus, CreateSubscriberStatusRequest>> _createValidators;
    private readonly IReadOnlyList<IRestUpdateValidator<SubscriberStatus, UpdateSubscriberStatusRequest>> _updateValidators;
    private readonly IReadOnlyList<IRestDeleteValidator<SubscriberStatus>> _deleteValidators;
    private readonly IRestCreateMutator<SubscriberStatus, CreateSubscriberStatusRequest> _createMutator;
    private readonly IRestUpdateMutator<SubscriberStatus, UpdateSubscriberStatusRequest> _updateMutator;
    private readonly IRestDeleteMutator<SubscriberStatus> _deleteMutator;

    public SubscriberStatusService(TelegramOperationsAdminDbContext db)
        : this(
            db,
            new IRestCreateValidator<SubscriberStatus, CreateSubscriberStatusRequest>[]
            {
                new SubscriberStatusStandardCreateValidator(),
            },
            new IRestUpdateValidator<SubscriberStatus, UpdateSubscriberStatusRequest>[]
            {
                new SubscriberStatusStandardUpdateValidator(),
            },
            Array.Empty<IRestDeleteValidator<SubscriberStatus>>(),
            new SubscriberStatusDefaultCreateMutator(db),
            new SubscriberStatusDefaultUpdateMutator(db),
            new SubscriberStatusDefaultDeleteMutator(db))
    {
    }

    public SubscriberStatusService(
        TelegramOperationsAdminDbContext db,
        IEnumerable<IRestCreateValidator<SubscriberStatus, CreateSubscriberStatusRequest>> createValidators,
        IEnumerable<IRestUpdateValidator<SubscriberStatus, UpdateSubscriberStatusRequest>> updateValidators,
        IEnumerable<IRestDeleteValidator<SubscriberStatus>> deleteValidators,
        IRestCreateMutator<SubscriberStatus, CreateSubscriberStatusRequest> createMutator,
        IRestUpdateMutator<SubscriberStatus, UpdateSubscriberStatusRequest> updateMutator,
        IRestDeleteMutator<SubscriberStatus> deleteMutator)
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

    public async Task<ListSubscriberStatusResult> ListAsync(
        ListSubscriberStatusRequest request,
        Func<IQueryable<SubscriberStatus>, IQueryable<SubscriberStatus>> authorizeQuery,
        CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);
        ArgumentNullException.ThrowIfNull(authorizeQuery);
        var page = NormalizePage(request.Page);
        var pageSize = NormalizePageSize(request.PageSize);
        IQueryable<SubscriberStatus> query = _db.SubscriberStatuses.AsNoTracking();
        query = authorizeQuery(query);
        query = ApplyFilters(query, request.Filters);
        var totalCount = await query.CountAsync(cancellationToken);
        var entities = await ApplySort(query, request.Sort)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(cancellationToken);

        return new ListSubscriberStatusResult
        {
            Items = entities.Select(ToDto).ToList(),
            TotalCount = totalCount,
            Page = page,
            PageSize = pageSize,
        };
    }

    public async Task<SubscriberStatus?> GetAsync(
        Guid id,
        bool asNoTracking,
        CancellationToken cancellationToken)
    {
        IQueryable<SubscriberStatus> query = _db.SubscriberStatuses;
        if (asNoTracking)
        {
            query = query.AsNoTracking();
        }

        return await query.FirstOrDefaultAsync(item => item.Id == id, cancellationToken);
    }

    public async Task<IReadOnlyList<SubscriberStatusLookupDto>> LookupAsync(
        LookupSubscriberStatusRequest request,
        Func<IQueryable<SubscriberStatus>, IQueryable<SubscriberStatus>> authorizeQuery,
        CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);
        ArgumentNullException.ThrowIfNull(authorizeQuery);
        var normalizedQuery = NormalizeSearchValue(request.Query);
        var take = Math.Clamp(request.Take, 1, MaxSuggestionCount);
        var query = _db.SubscriberStatuses.AsNoTracking();
        query = authorizeQuery(query);
        if (normalizedQuery.Length > 0)
        {
            query = query.Where(item => item.Name.ToUpper().Contains(normalizedQuery));
        }
        query = query.OrderBy(item => item.Name);

        return await query
            .Take(take)
            .Select(item => new SubscriberStatusLookupDto
            {
                Value = item.Id.ToString(),
                Label = item.Name,
            })
            .ToListAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<SubscriberStatusSuggestionDto>> SuggestAsync(
        string field,
        SuggestSubscriberStatusRequest request,
        Func<IQueryable<SubscriberStatus>, IQueryable<SubscriberStatus>> authorizeQuery,
        CancellationToken cancellationToken)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(field);
        ArgumentNullException.ThrowIfNull(request);
        ArgumentNullException.ThrowIfNull(authorizeQuery);
        var normalizedQuery = NormalizeSearchValue(request.Query);
        var take = Math.Clamp(request.Take, 1, MaxSuggestionCount);
        var query = _db.SubscriberStatuses.AsNoTracking();
        query = authorizeQuery(query);
        switch (NormalizeField(field))
        {
            case "code":
                return await query
                    .Where(item => item.Code != null)
                    .Where(item => normalizedQuery.Length == 0 || item.Code.ToUpper().Contains(normalizedQuery))
                    .Select(item => item.Code!)
                    .Distinct()
                    .OrderBy(value => value)
                    .Take(take)
                    .Select(value => new SubscriberStatusSuggestionDto
                    {
                        Value = value,
                        Label = value,
                    })
                    .ToListAsync(cancellationToken);
            case "name":
                return await query
                    .Where(item => item.Name != null)
                    .Where(item => normalizedQuery.Length == 0 || item.Name.ToUpper().Contains(normalizedQuery))
                    .Select(item => item.Name!)
                    .Distinct()
                    .OrderBy(value => value)
                    .Take(take)
                    .Select(value => new SubscriberStatusSuggestionDto
                    {
                        Value = value,
                        Label = value,
                    })
                    .ToListAsync(cancellationToken);
            default:
                break;
        }

        return Array.Empty<SubscriberStatusSuggestionDto>();
    }

    public async Task<IReadOnlyList<SubscriberStatusOptionDto>> OptionsAsync(
        string field,
        Func<IQueryable<SubscriberStatus>, IQueryable<SubscriberStatus>> authorizeQuery,
        CancellationToken cancellationToken)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(field);
        ArgumentNullException.ThrowIfNull(authorizeQuery);
        var query = _db.SubscriberStatuses.AsNoTracking();
        query = authorizeQuery(query);
        switch (NormalizeField(field))
        {
            default:
                break;
        }

        return Array.Empty<SubscriberStatusOptionDto>();
    }

    public async Task<RestCrudValidationResult> ValidateCreateAsync(
        CreateSubscriberStatusRequest request,
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
        SubscriberStatus entity,
        UpdateSubscriberStatusRequest request,
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
        SubscriberStatus entity,
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

    public async Task<SubscriberStatus> CreateAsync(
        CreateSubscriberStatusRequest request,
        Guid? currentUserId,
        Guid? currentAuditPositionId,
        CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);
        var context = new RestCrudMutationContext(currentUserId, currentAuditPositionId);
        var entity = await _createMutator.MutateAsync(request, context, cancellationToken);
        ArgumentNullException.ThrowIfNull(entity);
        await _db.SaveChangesAsync(cancellationToken);

        return entity;
    }

    public async Task<SubscriberStatus> UpdateAsync(
        SubscriberStatus entity,
        UpdateSubscriberStatusRequest request,
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

        return entity;
    }

    public async Task DeleteAsync(
        SubscriberStatus entity,
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
        SubscriberStatus entity,
        CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(entity);
        return Array.Empty<string>();
    }

    public SubscriberStatusDto ToDto(SubscriberStatus entity)
    {
        ArgumentNullException.ThrowIfNull(entity);
        return new SubscriberStatusDto
        {
            Id = entity.Id,
            Code = entity.Code,
            Name = entity.Name,
            SortOrder = entity.SortOrder,
        };
    }

    private static IQueryable<SubscriberStatus> ApplyFilters(
        IQueryable<SubscriberStatus> query,
        IReadOnlyList<ListSubscriberStatusFilter>? filters)
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
            case "code":
                if (normalizedFilterValue.Length == 0)
                {
                    break;
                }
                query = filterOperator switch
                {
                    "equals" => query.Where(item => item.Code.ToUpper() == normalizedFilterValue),
                    "startsWith" => query.Where(item => item.Code.ToUpper().StartsWith(normalizedFilterValue)),
                    _ => query.Where(item => item.Code.ToUpper().Contains(normalizedFilterValue)),
                };
                break;
            case "name":
                if (normalizedFilterValue.Length == 0)
                {
                    break;
                }
                query = filterOperator switch
                {
                    "equals" => query.Where(item => item.Name.ToUpper() == normalizedFilterValue),
                    "startsWith" => query.Where(item => item.Name.ToUpper().StartsWith(normalizedFilterValue)),
                    _ => query.Where(item => item.Name.ToUpper().Contains(normalizedFilterValue)),
                };
                break;
            case "id":
            {
                if (Guid.TryParse(filter.Value, out var parsedGuid))
                {
                    query = query.Where(item => item.Id == parsedGuid);
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

    private static IOrderedQueryable<SubscriberStatus> ApplySort(
        IQueryable<SubscriberStatus> query,
        IReadOnlyList<ListSubscriberStatusSort>? sortItems)
    {
        IOrderedQueryable<SubscriberStatus>? ordered = null;

        foreach (var sort in sortItems ?? Array.Empty<ListSubscriberStatusSort>())
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
            case "code":
                ordered = ordered is null
                    ? (descending ? query.OrderByDescending(item => item.Code) : query.OrderBy(item => item.Code))
                    : (descending ? ordered.ThenByDescending(item => item.Code) : ordered.ThenBy(item => item.Code));
                break;
            case "name":
                ordered = ordered is null
                    ? (descending ? query.OrderByDescending(item => item.Name) : query.OrderBy(item => item.Name))
                    : (descending ? ordered.ThenByDescending(item => item.Name) : ordered.ThenBy(item => item.Name));
                break;
            case "sortorder":
                ordered = ordered is null
                    ? (descending ? query.OrderByDescending(item => item.SortOrder) : query.OrderBy(item => item.SortOrder))
                    : (descending ? ordered.ThenByDescending(item => item.SortOrder) : ordered.ThenBy(item => item.SortOrder));
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

    private static bool HasMeaningfulFilter(ListSubscriberStatusFilter filter)
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
