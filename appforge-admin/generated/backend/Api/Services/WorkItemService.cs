#nullable enable

using Demo.BusinessOperations;
using Demo.BusinessOperations.Api.Contracts;
using Demo.BusinessOperations.Api.Customization;
using Demo.BusinessOperations.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Demo.BusinessOperations.Api.Services;

public sealed class WorkItemService
{
    private const int MaxPageSize = 100;
    private const int MaxSuggestionCount = 20;
    private readonly BusinessOperationsAdminDbContext _db;
    private readonly IReadOnlyList<IRestCreateValidator<WorkItem, CreateWorkItemRequest>> _createValidators;
    private readonly IReadOnlyList<IRestUpdateValidator<WorkItem, UpdateWorkItemRequest>> _updateValidators;
    private readonly IReadOnlyList<IRestDeleteValidator<WorkItem>> _deleteValidators;
    private readonly IRestCreateMutator<WorkItem, CreateWorkItemRequest> _createMutator;
    private readonly IRestUpdateMutator<WorkItem, UpdateWorkItemRequest> _updateMutator;
    private readonly IRestDeleteMutator<WorkItem> _deleteMutator;

    public WorkItemService(BusinessOperationsAdminDbContext db)
        : this(
            db,
            new IRestCreateValidator<WorkItem, CreateWorkItemRequest>[]
            {
                new WorkItemStandardCreateValidator(),
            },
            new IRestUpdateValidator<WorkItem, UpdateWorkItemRequest>[]
            {
                new WorkItemStandardUpdateValidator(),
            },
            Array.Empty<IRestDeleteValidator<WorkItem>>(),
            new WorkItemDefaultCreateMutator(db),
            new WorkItemDefaultUpdateMutator(db),
            new WorkItemDefaultDeleteMutator(db))
    {
    }

    public WorkItemService(
        BusinessOperationsAdminDbContext db,
        IEnumerable<IRestCreateValidator<WorkItem, CreateWorkItemRequest>> createValidators,
        IEnumerable<IRestUpdateValidator<WorkItem, UpdateWorkItemRequest>> updateValidators,
        IEnumerable<IRestDeleteValidator<WorkItem>> deleteValidators,
        IRestCreateMutator<WorkItem, CreateWorkItemRequest> createMutator,
        IRestUpdateMutator<WorkItem, UpdateWorkItemRequest> updateMutator,
        IRestDeleteMutator<WorkItem> deleteMutator)
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

    public async Task<ListWorkItemResult> ListAsync(
        ListWorkItemRequest request,
        Func<IQueryable<WorkItem>, IQueryable<WorkItem>> authorizeQuery,
        CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);
        ArgumentNullException.ThrowIfNull(authorizeQuery);
        var page = NormalizePage(request.Page);
        var pageSize = NormalizePageSize(request.PageSize);
        IQueryable<WorkItem> query = _db.WorkItems.AsNoTracking();
        query = authorizeQuery(query);
        query = ApplyFilters(query, request.Filters);
        var totalCount = await query.CountAsync(cancellationToken);
        var entities = await ApplySort(query, request.Sort)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(cancellationToken);

        return new ListWorkItemResult
        {
            Items = entities.Select(ToDto).ToList(),
            TotalCount = totalCount,
            Page = page,
            PageSize = pageSize,
        };
    }

    public async Task<WorkItem?> GetAsync(
        Guid id,
        bool asNoTracking,
        CancellationToken cancellationToken)
    {
        IQueryable<WorkItem> query = _db.WorkItems;
        if (asNoTracking)
        {
            query = query.AsNoTracking();
        }

        return await query.FirstOrDefaultAsync(item => item.Id == id, cancellationToken);
    }

    public async Task<IReadOnlyList<WorkItemLookupDto>> LookupAsync(
        LookupWorkItemRequest request,
        Func<IQueryable<WorkItem>, IQueryable<WorkItem>> authorizeQuery,
        CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);
        ArgumentNullException.ThrowIfNull(authorizeQuery);
        var normalizedQuery = NormalizeSearchValue(request.Query);
        var take = Math.Clamp(request.Take, 1, MaxSuggestionCount);
        var query = _db.WorkItems.AsNoTracking();
        query = authorizeQuery(query);
        if (normalizedQuery.Length > 0)
        {
            query = query.Where(item => item.TitleSearch.Contains(normalizedQuery));
        }
        query = query.OrderBy(item => item.Title);

        return await query
            .Take(take)
            .Select(item => new WorkItemLookupDto
            {
                Value = item.Id.ToString(),
                Label = item.Title,
            })
            .ToListAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<WorkItemSuggestionDto>> SuggestAsync(
        string field,
        SuggestWorkItemRequest request,
        Func<IQueryable<WorkItem>, IQueryable<WorkItem>> authorizeQuery,
        CancellationToken cancellationToken)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(field);
        ArgumentNullException.ThrowIfNull(request);
        ArgumentNullException.ThrowIfNull(authorizeQuery);
        var normalizedQuery = NormalizeSearchValue(request.Query);
        var take = Math.Clamp(request.Take, 1, MaxSuggestionCount);
        var query = _db.WorkItems.AsNoTracking();
        query = authorizeQuery(query);
        switch (NormalizeField(field))
        {
            case "title":
                return await query
                    .Where(item => item.Title != null)
                    .Where(item => normalizedQuery.Length == 0 || item.TitleSearch.Contains(normalizedQuery))
                    .Select(item => item.Title!)
                    .Distinct()
                    .OrderBy(value => value)
                    .Take(take)
                    .Select(value => new WorkItemSuggestionDto
                    {
                        Value = value,
                        Label = value,
                    })
                    .ToListAsync(cancellationToken);
            case "assignee":
                return await query
                    .Where(item => item.Assignee != null)
                    .Where(item => normalizedQuery.Length == 0 || item.AssigneeSearch.Contains(normalizedQuery))
                    .Select(item => item.Assignee!)
                    .Distinct()
                    .OrderBy(value => value)
                    .Take(take)
                    .Select(value => new WorkItemSuggestionDto
                    {
                        Value = value,
                        Label = value,
                    })
                    .ToListAsync(cancellationToken);
            case "status":
                return await query
                    .Where(item => item.Status != null)
                    .Where(item => normalizedQuery.Length == 0 || item.StatusSearch.Contains(normalizedQuery))
                    .Select(item => item.Status!)
                    .Distinct()
                    .OrderBy(value => value)
                    .Take(take)
                    .Select(value => new WorkItemSuggestionDto
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
                    .Select(value => new WorkItemSuggestionDto
                    {
                        Value = value,
                        Label = value,
                    })
                    .ToListAsync(cancellationToken);
            default:
                break;
        }

        return Array.Empty<WorkItemSuggestionDto>();
    }

    public async Task<IReadOnlyList<WorkItemOptionDto>> OptionsAsync(
        string field,
        Func<IQueryable<WorkItem>, IQueryable<WorkItem>> authorizeQuery,
        CancellationToken cancellationToken)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(field);
        ArgumentNullException.ThrowIfNull(authorizeQuery);
        var query = _db.WorkItems.AsNoTracking();
        query = authorizeQuery(query);
        switch (NormalizeField(field))
        {
            case "status":
                return await query
                    .Where(item => item.Status != null)
                    .Select(item => item.Status!)
                    .Distinct()
                    .OrderBy(value => value)
                    .Select(value => new WorkItemOptionDto
                    {
                        Value = value,
                        Label = value,
                    })
                    .ToListAsync(cancellationToken);
            default:
                break;
        }

        return Array.Empty<WorkItemOptionDto>();
    }

    public async Task<RestCrudValidationResult> ValidateCreateAsync(
        CreateWorkItemRequest request,
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
        WorkItem entity,
        UpdateWorkItemRequest request,
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
        WorkItem entity,
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

    public async Task<WorkItem> CreateAsync(
        CreateWorkItemRequest request,
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

    public async Task<WorkItem> UpdateAsync(
        WorkItem entity,
        UpdateWorkItemRequest request,
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
        WorkItem entity,
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
        WorkItem entity,
        CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(entity);
        return Array.Empty<string>();
    }

    public WorkItemDto ToDto(WorkItem entity)
    {
        ArgumentNullException.ThrowIfNull(entity);
        return new WorkItemDto
        {
            Id = entity.Id,
            ServiceRequestId = entity.ServiceRequestId,
            Title = entity.Title,
            Assignee = entity.Assignee,
            Status = entity.Status,
            Note = entity.Note,
        };
    }

    private static IQueryable<WorkItem> ApplyFilters(
        IQueryable<WorkItem> query,
        IReadOnlyList<ListWorkItemFilter>? filters)
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
            case "status":
            {
                var normalizedFilterValues = filter.Values
                    .Select(NormalizeSearchValue)
                    .Where(value => value.Length > 0)
                    .Distinct(StringComparer.Ordinal)
                    .ToList();
                if (normalizedFilterValues.Count == 0)
                {
                    break;
                }
                query = query.Where(item => normalizedFilterValues.Contains(item.StatusSearch));
                break;
            }
            case "title":
                if (normalizedFilterValue.Length == 0)
                {
                    break;
                }
                query = filterOperator switch
                {
                    "equals" => query.Where(item => item.TitleSearch == normalizedFilterValue),
                    "startsWith" => query.Where(item => item.TitleSearch.StartsWith(normalizedFilterValue)),
                    _ => query.Where(item => item.TitleSearch.Contains(normalizedFilterValue)),
                };
                break;
            case "assignee":
                if (normalizedFilterValue.Length == 0)
                {
                    break;
                }
                query = filterOperator switch
                {
                    "equals" => query.Where(item => item.AssigneeSearch == normalizedFilterValue),
                    "startsWith" => query.Where(item => item.AssigneeSearch.StartsWith(normalizedFilterValue)),
                    _ => query.Where(item => item.AssigneeSearch.Contains(normalizedFilterValue)),
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
            case "id":
            {
                if (Guid.TryParse(filter.Value, out var parsedGuid))
                {
                    query = query.Where(item => item.Id == parsedGuid);
                }
                break;
            }
            case "servicerequestid":
            {
                if (Guid.TryParse(filter.Value, out var parsedGuid))
                {
                    query = query.Where(item => item.ServiceRequestId == parsedGuid);
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

    private static IOrderedQueryable<WorkItem> ApplySort(
        IQueryable<WorkItem> query,
        IReadOnlyList<ListWorkItemSort>? sortItems)
    {
        IOrderedQueryable<WorkItem>? ordered = null;

        foreach (var sort in sortItems ?? Array.Empty<ListWorkItemSort>())
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
            case "servicerequestid":
                ordered = ordered is null
                    ? (descending ? query.OrderByDescending(item => item.ServiceRequestId) : query.OrderBy(item => item.ServiceRequestId))
                    : (descending ? ordered.ThenByDescending(item => item.ServiceRequestId) : ordered.ThenBy(item => item.ServiceRequestId));
                break;
            case "title":
                ordered = ordered is null
                    ? (descending ? query.OrderByDescending(item => item.Title) : query.OrderBy(item => item.Title))
                    : (descending ? ordered.ThenByDescending(item => item.Title) : ordered.ThenBy(item => item.Title));
                break;
            case "assignee":
                ordered = ordered is null
                    ? (descending ? query.OrderByDescending(item => item.Assignee) : query.OrderBy(item => item.Assignee))
                    : (descending ? ordered.ThenByDescending(item => item.Assignee) : ordered.ThenBy(item => item.Assignee));
                break;
            case "status":
                ordered = ordered is null
                    ? (descending ? query.OrderByDescending(item => item.Status) : query.OrderBy(item => item.Status))
                    : (descending ? ordered.ThenByDescending(item => item.Status) : ordered.ThenBy(item => item.Status));
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

    private static bool HasMeaningfulFilter(ListWorkItemFilter filter)
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
