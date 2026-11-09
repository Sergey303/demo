#nullable enable

using Demo.BusinessOperations;
using Demo.BusinessOperations.Api.Contracts;
using Demo.BusinessOperations.Api.Customization;
using Demo.BusinessOperations.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Demo.BusinessOperations.Api.Services;

public sealed class CustomerService
{
    private const int MaxPageSize = 100;
    private const int MaxSuggestionCount = 20;
    private readonly BusinessOperationsAdminDbContext _db;
    private readonly IReadOnlyList<IRestCreateValidator<Customer, CreateCustomerRequest>> _createValidators;
    private readonly IReadOnlyList<IRestUpdateValidator<Customer, UpdateCustomerRequest>> _updateValidators;
    private readonly IReadOnlyList<IRestDeleteValidator<Customer>> _deleteValidators;
    private readonly IRestCreateMutator<Customer, CreateCustomerRequest> _createMutator;
    private readonly IRestUpdateMutator<Customer, UpdateCustomerRequest> _updateMutator;
    private readonly IRestDeleteMutator<Customer> _deleteMutator;

    public CustomerService(BusinessOperationsAdminDbContext db)
        : this(
            db,
            new IRestCreateValidator<Customer, CreateCustomerRequest>[]
            {
                new CustomerStandardCreateValidator(),
            },
            new IRestUpdateValidator<Customer, UpdateCustomerRequest>[]
            {
                new CustomerStandardUpdateValidator(),
            },
            Array.Empty<IRestDeleteValidator<Customer>>(),
            new CustomerDefaultCreateMutator(db),
            new CustomerDefaultUpdateMutator(db),
            new CustomerDefaultDeleteMutator(db))
    {
    }

    public CustomerService(
        BusinessOperationsAdminDbContext db,
        IEnumerable<IRestCreateValidator<Customer, CreateCustomerRequest>> createValidators,
        IEnumerable<IRestUpdateValidator<Customer, UpdateCustomerRequest>> updateValidators,
        IEnumerable<IRestDeleteValidator<Customer>> deleteValidators,
        IRestCreateMutator<Customer, CreateCustomerRequest> createMutator,
        IRestUpdateMutator<Customer, UpdateCustomerRequest> updateMutator,
        IRestDeleteMutator<Customer> deleteMutator)
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

    public async Task<ListCustomerResult> ListAsync(
        ListCustomerRequest request,
        Func<IQueryable<Customer>, IQueryable<Customer>> authorizeQuery,
        CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);
        ArgumentNullException.ThrowIfNull(authorizeQuery);
        var page = NormalizePage(request.Page);
        var pageSize = NormalizePageSize(request.PageSize);
        IQueryable<Customer> query = _db.Customers.AsNoTracking();
        query = authorizeQuery(query);
        query = ApplyFilters(query, request.Filters);
        var totalCount = await query.CountAsync(cancellationToken);
        var entities = await ApplySort(query, request.Sort)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(cancellationToken);

        return new ListCustomerResult
        {
            Items = entities.Select(ToDto).ToList(),
            TotalCount = totalCount,
            Page = page,
            PageSize = pageSize,
        };
    }

    public async Task<Customer?> GetAsync(
        Guid id,
        bool asNoTracking,
        CancellationToken cancellationToken)
    {
        IQueryable<Customer> query = _db.Customers;
        if (asNoTracking)
        {
            query = query.AsNoTracking();
        }

        return await query.FirstOrDefaultAsync(item => item.Id == id, cancellationToken);
    }

    public async Task<IReadOnlyList<CustomerLookupDto>> LookupAsync(
        LookupCustomerRequest request,
        Func<IQueryable<Customer>, IQueryable<Customer>> authorizeQuery,
        CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);
        ArgumentNullException.ThrowIfNull(authorizeQuery);
        var normalizedQuery = NormalizeSearchValue(request.Query);
        var take = Math.Clamp(request.Take, 1, MaxSuggestionCount);
        var query = _db.Customers.AsNoTracking();
        query = authorizeQuery(query);
        if (normalizedQuery.Length > 0)
        {
            query = query.Where(item => item.NameSearch.Contains(normalizedQuery));
        }
        query = query.OrderBy(item => item.Name);

        return await query
            .Take(take)
            .Select(item => new CustomerLookupDto
            {
                Value = item.Id.ToString(),
                Label = item.Name,
            })
            .ToListAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<CustomerSuggestionDto>> SuggestAsync(
        string field,
        SuggestCustomerRequest request,
        Func<IQueryable<Customer>, IQueryable<Customer>> authorizeQuery,
        CancellationToken cancellationToken)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(field);
        ArgumentNullException.ThrowIfNull(request);
        ArgumentNullException.ThrowIfNull(authorizeQuery);
        var normalizedQuery = NormalizeSearchValue(request.Query);
        var take = Math.Clamp(request.Take, 1, MaxSuggestionCount);
        var query = _db.Customers.AsNoTracking();
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
                    .Select(value => new CustomerSuggestionDto
                    {
                        Value = value,
                        Label = value,
                    })
                    .ToListAsync(cancellationToken);
            case "email":
                return await query
                    .Where(item => item.Email != null)
                    .Where(item => normalizedQuery.Length == 0 || item.EmailSearch.Contains(normalizedQuery))
                    .Select(item => item.Email!)
                    .Distinct()
                    .OrderBy(value => value)
                    .Take(take)
                    .Select(value => new CustomerSuggestionDto
                    {
                        Value = value,
                        Label = value,
                    })
                    .ToListAsync(cancellationToken);
            case "segment":
                return await query
                    .Where(item => item.Segment != null)
                    .Where(item => normalizedQuery.Length == 0 || item.SegmentSearch.Contains(normalizedQuery))
                    .Select(item => item.Segment!)
                    .Distinct()
                    .OrderBy(value => value)
                    .Take(take)
                    .Select(value => new CustomerSuggestionDto
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
                    .Select(value => new CustomerSuggestionDto
                    {
                        Value = value,
                        Label = value,
                    })
                    .ToListAsync(cancellationToken);
            default:
                break;
        }

        return Array.Empty<CustomerSuggestionDto>();
    }

    public async Task<IReadOnlyList<CustomerOptionDto>> OptionsAsync(
        string field,
        Func<IQueryable<Customer>, IQueryable<Customer>> authorizeQuery,
        CancellationToken cancellationToken)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(field);
        ArgumentNullException.ThrowIfNull(authorizeQuery);
        var query = _db.Customers.AsNoTracking();
        query = authorizeQuery(query);
        switch (NormalizeField(field))
        {
            default:
                break;
        }

        return Array.Empty<CustomerOptionDto>();
    }

    public async Task<RestCrudValidationResult> ValidateCreateAsync(
        CreateCustomerRequest request,
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
        Customer entity,
        UpdateCustomerRequest request,
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
        Customer entity,
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

    public async Task<Customer> CreateAsync(
        CreateCustomerRequest request,
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

    public async Task<Customer> UpdateAsync(
        Customer entity,
        UpdateCustomerRequest request,
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
        Customer entity,
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
        Customer entity,
        CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(entity);
        return Array.Empty<string>();
    }

    public CustomerDto ToDto(Customer entity)
    {
        ArgumentNullException.ThrowIfNull(entity);
        return new CustomerDto
        {
            Id = entity.Id,
            Name = entity.Name,
            Email = entity.Email,
            Segment = entity.Segment,
            Note = entity.Note,
        };
    }

    private static IQueryable<Customer> ApplyFilters(
        IQueryable<Customer> query,
        IReadOnlyList<ListCustomerFilter>? filters)
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
            case "email":
                if (normalizedFilterValue.Length == 0)
                {
                    break;
                }
                query = filterOperator switch
                {
                    "equals" => query.Where(item => item.EmailSearch == normalizedFilterValue),
                    "startsWith" => query.Where(item => item.EmailSearch.StartsWith(normalizedFilterValue)),
                    _ => query.Where(item => item.EmailSearch.Contains(normalizedFilterValue)),
                };
                break;
            case "segment":
                if (normalizedFilterValue.Length == 0)
                {
                    break;
                }
                query = filterOperator switch
                {
                    "equals" => query.Where(item => item.SegmentSearch == normalizedFilterValue),
                    "startsWith" => query.Where(item => item.SegmentSearch.StartsWith(normalizedFilterValue)),
                    _ => query.Where(item => item.SegmentSearch.Contains(normalizedFilterValue)),
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

    private static IOrderedQueryable<Customer> ApplySort(
        IQueryable<Customer> query,
        IReadOnlyList<ListCustomerSort>? sortItems)
    {
        IOrderedQueryable<Customer>? ordered = null;

        foreach (var sort in sortItems ?? Array.Empty<ListCustomerSort>())
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
            case "email":
                ordered = ordered is null
                    ? (descending ? query.OrderByDescending(item => item.Email) : query.OrderBy(item => item.Email))
                    : (descending ? ordered.ThenByDescending(item => item.Email) : ordered.ThenBy(item => item.Email));
                break;
            case "segment":
                ordered = ordered is null
                    ? (descending ? query.OrderByDescending(item => item.Segment) : query.OrderBy(item => item.Segment))
                    : (descending ? ordered.ThenByDescending(item => item.Segment) : ordered.ThenBy(item => item.Segment));
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

    private static bool HasMeaningfulFilter(ListCustomerFilter filter)
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
