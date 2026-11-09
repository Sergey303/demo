#nullable enable

using Demo.BusinessOperations;
using Demo.BusinessOperations.Api.Contracts;
using Demo.BusinessOperations.Api.Customization;
using Demo.BusinessOperations.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Demo.BusinessOperations.Api.Services;

public sealed class ServiceRequestService
{
    private const int MaxPageSize = 100;
    private const int MaxSuggestionCount = 20;
    private readonly BusinessOperationsAdminDbContext _db;
    private readonly IReadOnlyList<IRestCreateValidator<ServiceRequest, CreateServiceRequestRequest>> _createValidators;
    private readonly IReadOnlyList<IRestUpdateValidator<ServiceRequest, UpdateServiceRequestRequest>> _updateValidators;
    private readonly IReadOnlyList<IRestDeleteValidator<ServiceRequest>> _deleteValidators;
    private readonly IRestCreateMutator<ServiceRequest, CreateServiceRequestRequest> _createMutator;
    private readonly IRestUpdateMutator<ServiceRequest, UpdateServiceRequestRequest> _updateMutator;
    private readonly IRestDeleteMutator<ServiceRequest> _deleteMutator;

    public ServiceRequestService(BusinessOperationsAdminDbContext db)
        : this(
            db,
            new IRestCreateValidator<ServiceRequest, CreateServiceRequestRequest>[]
            {
                new ServiceRequestStandardCreateValidator(),
            },
            new IRestUpdateValidator<ServiceRequest, UpdateServiceRequestRequest>[]
            {
                new ServiceRequestStandardUpdateValidator(),
            },
            Array.Empty<IRestDeleteValidator<ServiceRequest>>(),
            new ServiceRequestDefaultCreateMutator(db),
            new ServiceRequestDefaultUpdateMutator(db),
            new ServiceRequestDefaultDeleteMutator(db))
    {
    }

    public ServiceRequestService(
        BusinessOperationsAdminDbContext db,
        IEnumerable<IRestCreateValidator<ServiceRequest, CreateServiceRequestRequest>> createValidators,
        IEnumerable<IRestUpdateValidator<ServiceRequest, UpdateServiceRequestRequest>> updateValidators,
        IEnumerable<IRestDeleteValidator<ServiceRequest>> deleteValidators,
        IRestCreateMutator<ServiceRequest, CreateServiceRequestRequest> createMutator,
        IRestUpdateMutator<ServiceRequest, UpdateServiceRequestRequest> updateMutator,
        IRestDeleteMutator<ServiceRequest> deleteMutator)
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

    public async Task<ListServiceRequestResult> ListAsync(
        ListServiceRequestRequest request,
        Func<IQueryable<ServiceRequest>, IQueryable<ServiceRequest>> authorizeQuery,
        CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);
        ArgumentNullException.ThrowIfNull(authorizeQuery);
        var page = NormalizePage(request.Page);
        var pageSize = NormalizePageSize(request.PageSize);
        IQueryable<ServiceRequest> query = _db.ServiceRequests.AsNoTracking();
        query = authorizeQuery(query);
        query = ApplyFilters(query, request.Filters);
        var totalCount = await query.CountAsync(cancellationToken);
        var entities = await ApplySort(query, request.Sort)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(cancellationToken);

        return new ListServiceRequestResult
        {
            Items = entities.Select(ToDto).ToList(),
            TotalCount = totalCount,
            Page = page,
            PageSize = pageSize,
        };
    }

    public async Task<ServiceRequest?> GetAsync(
        Guid id,
        bool asNoTracking,
        CancellationToken cancellationToken)
    {
        IQueryable<ServiceRequest> query = _db.ServiceRequests;
        if (asNoTracking)
        {
            query = query.AsNoTracking();
        }

        return await query.FirstOrDefaultAsync(item => item.Id == id, cancellationToken);
    }

    public async Task<IReadOnlyList<ServiceRequestLookupDto>> LookupAsync(
        LookupServiceRequestRequest request,
        Func<IQueryable<ServiceRequest>, IQueryable<ServiceRequest>> authorizeQuery,
        CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);
        ArgumentNullException.ThrowIfNull(authorizeQuery);
        var normalizedQuery = NormalizeSearchValue(request.Query);
        var take = Math.Clamp(request.Take, 1, MaxSuggestionCount);
        var query = _db.ServiceRequests.AsNoTracking();
        query = authorizeQuery(query);
        if (normalizedQuery.Length > 0)
        {
            query = query.Where(item => item.TitleSearch.Contains(normalizedQuery));
        }
        query = query.OrderBy(item => item.Title);

        return await query
            .Take(take)
            .Select(item => new ServiceRequestLookupDto
            {
                Value = item.Id.ToString(),
                Label = item.Title,
            })
            .ToListAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<ServiceRequestSuggestionDto>> SuggestAsync(
        string field,
        SuggestServiceRequestRequest request,
        Func<IQueryable<ServiceRequest>, IQueryable<ServiceRequest>> authorizeQuery,
        CancellationToken cancellationToken)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(field);
        ArgumentNullException.ThrowIfNull(request);
        ArgumentNullException.ThrowIfNull(authorizeQuery);
        var normalizedQuery = NormalizeSearchValue(request.Query);
        var take = Math.Clamp(request.Take, 1, MaxSuggestionCount);
        var query = _db.ServiceRequests.AsNoTracking();
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
                    .Select(value => new ServiceRequestSuggestionDto
                    {
                        Value = value,
                        Label = value,
                    })
                    .ToListAsync(cancellationToken);
            case "priority":
                return await query
                    .Where(item => item.Priority != null)
                    .Where(item => normalizedQuery.Length == 0 || item.PrioritySearch.Contains(normalizedQuery))
                    .Select(item => item.Priority!)
                    .Distinct()
                    .OrderBy(value => value)
                    .Take(take)
                    .Select(value => new ServiceRequestSuggestionDto
                    {
                        Value = value,
                        Label = value,
                    })
                    .ToListAsync(cancellationToken);
            case "description":
                return await query
                    .Where(item => item.Description != null)
                    .Where(item => normalizedQuery.Length == 0 || item.DescriptionSearch.Contains(normalizedQuery))
                    .Select(item => item.Description!)
                    .Distinct()
                    .OrderBy(value => value)
                    .Take(take)
                    .Select(value => new ServiceRequestSuggestionDto
                    {
                        Value = value,
                        Label = value,
                    })
                    .ToListAsync(cancellationToken);
            default:
                break;
        }

        return Array.Empty<ServiceRequestSuggestionDto>();
    }

    public async Task<IReadOnlyList<ServiceRequestOptionDto>> OptionsAsync(
        string field,
        Func<IQueryable<ServiceRequest>, IQueryable<ServiceRequest>> authorizeQuery,
        CancellationToken cancellationToken)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(field);
        ArgumentNullException.ThrowIfNull(authorizeQuery);
        var query = _db.ServiceRequests.AsNoTracking();
        query = authorizeQuery(query);
        switch (NormalizeField(field))
        {
            default:
                break;
        }

        return Array.Empty<ServiceRequestOptionDto>();
    }

    public async Task<RestCrudValidationResult> ValidateCreateAsync(
        CreateServiceRequestRequest request,
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
        ServiceRequest entity,
        UpdateServiceRequestRequest request,
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
        ServiceRequest entity,
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

    public async Task<ServiceRequest> CreateAsync(
        CreateServiceRequestRequest request,
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

    public async Task<ServiceRequest> UpdateAsync(
        ServiceRequest entity,
        UpdateServiceRequestRequest request,
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
        ServiceRequest entity,
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
        ServiceRequest entity,
        CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(entity);
        return Array.Empty<string>();
    }

    public ServiceRequestDto ToDto(ServiceRequest entity)
    {
        ArgumentNullException.ThrowIfNull(entity);
        return new ServiceRequestDto
        {
            Id = entity.Id,
            CustomerId = entity.CustomerId,
            Title = entity.Title,
            Priority = entity.Priority,
            Description = entity.Description,
        };
    }

    private static IQueryable<ServiceRequest> ApplyFilters(
        IQueryable<ServiceRequest> query,
        IReadOnlyList<ListServiceRequestFilter>? filters)
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
            case "priority":
                if (normalizedFilterValue.Length == 0)
                {
                    break;
                }
                query = filterOperator switch
                {
                    "equals" => query.Where(item => item.PrioritySearch == normalizedFilterValue),
                    "startsWith" => query.Where(item => item.PrioritySearch.StartsWith(normalizedFilterValue)),
                    _ => query.Where(item => item.PrioritySearch.Contains(normalizedFilterValue)),
                };
                break;
            case "description":
                if (normalizedFilterValue.Length == 0)
                {
                    break;
                }
                query = filterOperator switch
                {
                    "equals" => query.Where(item => item.DescriptionSearch == normalizedFilterValue),
                    "startsWith" => query.Where(item => item.DescriptionSearch.StartsWith(normalizedFilterValue)),
                    _ => query.Where(item => item.DescriptionSearch.Contains(normalizedFilterValue)),
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
            case "customerid":
            {
                if (Guid.TryParse(filter.Value, out var parsedGuid))
                {
                    query = query.Where(item => item.CustomerId == parsedGuid);
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

    private static IOrderedQueryable<ServiceRequest> ApplySort(
        IQueryable<ServiceRequest> query,
        IReadOnlyList<ListServiceRequestSort>? sortItems)
    {
        IOrderedQueryable<ServiceRequest>? ordered = null;

        foreach (var sort in sortItems ?? Array.Empty<ListServiceRequestSort>())
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
            case "customerid":
                ordered = ordered is null
                    ? (descending ? query.OrderByDescending(item => item.CustomerId) : query.OrderBy(item => item.CustomerId))
                    : (descending ? ordered.ThenByDescending(item => item.CustomerId) : ordered.ThenBy(item => item.CustomerId));
                break;
            case "title":
                ordered = ordered is null
                    ? (descending ? query.OrderByDescending(item => item.Title) : query.OrderBy(item => item.Title))
                    : (descending ? ordered.ThenByDescending(item => item.Title) : ordered.ThenBy(item => item.Title));
                break;
            case "priority":
                ordered = ordered is null
                    ? (descending ? query.OrderByDescending(item => item.Priority) : query.OrderBy(item => item.Priority))
                    : (descending ? ordered.ThenByDescending(item => item.Priority) : ordered.ThenBy(item => item.Priority));
                break;
            case "description":
                ordered = ordered is null
                    ? (descending ? query.OrderByDescending(item => item.Description) : query.OrderBy(item => item.Description))
                    : (descending ? ordered.ThenByDescending(item => item.Description) : ordered.ThenBy(item => item.Description));
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

    private static bool HasMeaningfulFilter(ListServiceRequestFilter filter)
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
