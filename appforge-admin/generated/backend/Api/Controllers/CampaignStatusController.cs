#nullable enable

using System.Security.Claims;
using ChatPilot.Api.FrontendActions;
using Demo.TelegramOperations;
using Demo.TelegramOperations.Api.Contracts;
using Demo.TelegramOperations.Api.Customization;
using Demo.TelegramOperations.Api.Services;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Demo.TelegramOperations.Api.Controllers;

[ApiController]
[RestCrudController("campaign.status", BrowserDurableMutations = true)]
[Route("api/campaignstatuses")]
public sealed class CampaignStatusController : ControllerBase
{
    private const string CreateEndpointKey = "post:/api/campaignstatuses";
    private const string UpdateEndpointKey = "put:/api/campaignstatuses/{id}";
    private const string DeleteEndpointKey = "delete:/api/campaignstatuses/{id}";
    private static bool RequireMutationIdempotencyKey => true;
    private readonly CampaignStatusService _service;
    private readonly RestCrudMutationIdempotencyService _mutationIdempotency;

    public CampaignStatusController(
        CampaignStatusService service,
        RestCrudMutationIdempotencyService mutationIdempotency)
    {
        ArgumentNullException.ThrowIfNull(service);
        ArgumentNullException.ThrowIfNull(mutationIdempotency);
        _service = service;
        _mutationIdempotency = mutationIdempotency;
    }

    [PolicyGate("CampaignStatus.Read")]
    [HttpGet]
    public async Task<ActionResult<ListCampaignStatusResult>> List(
        [FromQuery] ListCampaignStatusRequest request,
        CancellationToken cancellationToken)
    {
        if (!CanRead())
        {
            return Forbid();
        }
        var result = await _service.ListAsync(request, ApplyReadRowAuthorization, cancellationToken);
        return Ok(result);
    }

    [PolicyGate("CampaignStatus.Read")]
    [HttpGet("{id}")]
    public async Task<ActionResult<CampaignStatusDto>> Get(
        Guid id,
        CancellationToken cancellationToken)
    {
        var entity = await _service.GetAsync(id, asNoTracking: true, cancellationToken);
        if (entity is null)
        {
            return NotFound();
        }

        if (!CanRead())
        {
            return Forbid();
        }
        if (!CanAccessRead(entity))
        {
            return Forbid();
        }
        return Ok(_service.ToDto(entity));
    }

    [PolicyGate("CampaignStatus.Read")]
    [HttpGet("lookup")]
    [ApiOperation(ApiOperationKind.Query)]
    [ProducesResponseType(typeof(IReadOnlyList<CampaignStatusLookupDto>), 200)]
    public async Task<ActionResult<IReadOnlyList<CampaignStatusLookupDto>>> Lookup(
        [FromQuery] LookupCampaignStatusRequest request,
        CancellationToken cancellationToken)
    {
        if (!CanRead())
        {
            return Forbid();
        }
        return Ok(await _service.LookupAsync(request, ApplyReadRowAuthorization, cancellationToken));
    }

    [PolicyGate("CampaignStatus.Read")]
    [HttpGet("suggest/{field}")]
    [ApiOperation(ApiOperationKind.Query)]
    [ProducesResponseType(typeof(IReadOnlyList<CampaignStatusSuggestionDto>), 200)]
    public async Task<ActionResult<IReadOnlyList<CampaignStatusSuggestionDto>>> Suggest(
        string field,
        [FromQuery] SuggestCampaignStatusRequest request,
        CancellationToken cancellationToken)
    {
        if (!CanRead())
        {
            return Forbid();
        }
        return Ok(await _service.SuggestAsync(field, request, ApplyReadRowAuthorization, cancellationToken));
    }

    [PolicyGate("CampaignStatus.Read")]
    [HttpGet("options/{field}")]
    [ApiOperation(ApiOperationKind.Query)]
    [ProducesResponseType(typeof(IReadOnlyList<CampaignStatusOptionDto>), 200)]
    public async Task<ActionResult<IReadOnlyList<CampaignStatusOptionDto>>> Options(
        string field,
        CancellationToken cancellationToken)
    {
        if (!CanRead())
        {
            return Forbid();
        }
        return Ok(await _service.OptionsAsync(field, ApplyReadRowAuthorization, cancellationToken));
    }

    [PolicyGate("CampaignStatus.Create")]
    [HttpPost]
    public async Task<ActionResult<CampaignStatusDto>> Create(
        CreateCampaignStatusRequest request,
        CancellationToken cancellationToken)
    {
        if (!CanCreate())
        {
            return Forbid();
        }
        var idempotencyError = TryResolveMutationIdempotencyKey(out var idempotencyKey);
        if (idempotencyError is not null)
        {
            return idempotencyError;
        }
        var requestFingerprint = idempotencyKey is null
            ? null
            : RestCrudMutationIdempotencyService.CreateBodyFingerprint(request);
        var subjectKey = idempotencyKey is null ? string.Empty : GetCurrentMutationSubjectKey();
        try
        {
            var replay = await _mutationIdempotency.TryGetAsync<CampaignStatusDto>(
                subjectKey, CreateEndpointKey, idempotencyKey, requestFingerprint, cancellationToken);
            if (replay is not null)
            {
                return CreatedAtAction(nameof(Get), new { id = replay.Value.Id }, replay.Value);
            }

            var currentUserId = GetCurrentUserId();
            var currentAuditPositionId = GetCurrentAuditPositionId();
            var validationError = ToValidationError(await _service.ValidateCreateAsync(
                request,
                currentUserId,
                currentAuditPositionId,
                cancellationToken));
            if (validationError is not null)
            {
                return validationError;
            }

            var result = await _mutationIdempotency.ExecuteAsync(
                subjectKey,
                CreateEndpointKey,
                idempotencyKey,
                requestFingerprint,
                async mutationCancellationToken =>
                {
                    var entity = await _service.CreateAsync(
                        request,
                        currentUserId,
                        currentAuditPositionId,
                        mutationCancellationToken);
                    AddWarnings(await _service.GetMutationWarningsAsync(entity, mutationCancellationToken));
                    return _service.ToDto(entity);
                },
                cancellationToken);

            return CreatedAtAction(nameof(Get), new { id = result.Value.Id }, result.Value);
        }
        catch (RestCrudMutationIdempotencyConflictException)
        {
            return Conflict(new { code = CampaignStatusApiErrorCodes.IdempotencyConflict });
        }
    }

    [PolicyGate("CampaignStatus.Update")]
    [HttpPut("{id}")]
    public async Task<ActionResult<CampaignStatusDto>> Update(
        Guid id,
        UpdateCampaignStatusRequest request,
        CancellationToken cancellationToken)
    {
        if (!CanUpdate())
        {
            return Forbid();
        }
        var idempotencyError = TryResolveMutationIdempotencyKey(out var idempotencyKey);
        if (idempotencyError is not null)
        {
            return idempotencyError;
        }
        var requestFingerprint = idempotencyKey is null
            ? null
            : RestCrudMutationIdempotencyService.CreateRouteAndBodyFingerprint(id, request);
        var subjectKey = idempotencyKey is null ? string.Empty : GetCurrentMutationSubjectKey();
        try
        {
            var replay = await _mutationIdempotency.TryGetAsync<CampaignStatusDto>(
                subjectKey, UpdateEndpointKey, idempotencyKey, requestFingerprint, cancellationToken);
            if (replay is not null)
            {
                return Ok(replay.Value);
            }

            var entity = await _service.GetAsync(id, asNoTracking: false, cancellationToken);
            if (entity is null)
            {
                return NotFound();
            }

        if (!CanAccessUpdate(entity))
        {
            return Forbid();
        }
            var currentUserId = GetCurrentUserId();
            var currentAuditPositionId = GetCurrentAuditPositionId();
            var validationError = ToValidationError(await _service.ValidateUpdateAsync(
                entity,
                request,
                currentUserId,
                currentAuditPositionId,
                cancellationToken));
            if (validationError is not null)
            {
                return validationError;
            }

            var result = await _mutationIdempotency.ExecuteAsync(
                subjectKey,
                UpdateEndpointKey,
                idempotencyKey,
                requestFingerprint,
                async mutationCancellationToken =>
                {
                    var updated = await _service.UpdateAsync(
                        entity,
                        request,
                        currentUserId,
                        currentAuditPositionId,
                        mutationCancellationToken);
                    AddWarnings(await _service.GetMutationWarningsAsync(updated, mutationCancellationToken));
                    return _service.ToDto(updated);
                },
                cancellationToken);

            return Ok(result.Value);
        }
        catch (RestCrudMutationIdempotencyConflictException)
        {
            return Conflict(new { code = CampaignStatusApiErrorCodes.IdempotencyConflict });
        }
    }

    [PolicyGate("CampaignStatus.Delete")]
    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken cancellationToken)
    {
        if (!CanDelete())
        {
            return Forbid();
        }
        var idempotencyError = TryResolveMutationIdempotencyKey(out var idempotencyKey);
        if (idempotencyError is not null)
        {
            return idempotencyError;
        }
        var requestFingerprint = idempotencyKey is null
            ? null
            : RestCrudMutationIdempotencyService.CreateRouteFingerprint(id);
        var subjectKey = idempotencyKey is null ? string.Empty : GetCurrentMutationSubjectKey();
        try
        {
            if (await _mutationIdempotency.HasCompletedAsync(
                subjectKey, DeleteEndpointKey, idempotencyKey, requestFingerprint, cancellationToken))
            {
                return NoContent();
            }

            var entity = await _service.GetAsync(id, asNoTracking: false, cancellationToken);
            if (entity is null)
            {
                return NotFound();
            }

        if (!CanAccessDelete(entity))
        {
            return Forbid();
        }
            var currentUserId = GetCurrentUserId();
            var currentAuditPositionId = GetCurrentAuditPositionId();
            var validationError = ToValidationError(await _service.ValidateDeleteAsync(
                entity,
                currentUserId,
                currentAuditPositionId,
                cancellationToken));
            if (validationError is not null)
            {
                return validationError;
            }

            await _mutationIdempotency.ExecuteNoContentAsync(
                subjectKey,
                DeleteEndpointKey,
                idempotencyKey,
                requestFingerprint,
                mutationCancellationToken => _service.DeleteAsync(
                    entity,
                    currentUserId,
                    currentAuditPositionId,
                    mutationCancellationToken),
                cancellationToken);

            return NoContent();
        }
        catch (RestCrudMutationIdempotencyConflictException)
        {
            return Conflict(new { code = CampaignStatusApiErrorCodes.IdempotencyConflict });
        }
    }

    private bool CanRead()
    {
        return HasPermission("CampaignStatus.Read")
            || CanReadAll()
            || CanReadOwn();
    }

    private bool CanCreate()
    {
        return HasPermission("CampaignStatus.Create")
            || CanCreateAll()
            || CanCreateOwn();
    }

    private bool CanUpdate()
    {
        return HasPermission("CampaignStatus.Update")
            || CanUpdateAll()
            || CanUpdateOwn();
    }

    private bool CanDelete()
    {
        return HasPermission("CampaignStatus.Delete")
            || CanDeleteAll()
            || CanDeleteOwn();
    }

    private bool CanReadAll()
    {
        return HasAnyRole("Admin");
    }

    private bool CanReadOwn()
    {
        return false;
    }

    private bool CanCreateAll()
    {
        return HasAnyRole("Admin");
    }

    private bool CanCreateOwn()
    {
        return false;
    }

    private bool CanUpdateAll()
    {
        return HasAnyRole("Admin");
    }

    private bool CanUpdateOwn()
    {
        return false;
    }

    private bool CanDeleteAll()
    {
        return HasAnyRole("Admin");
    }

    private bool CanDeleteOwn()
    {
        return false;
    }

    private IQueryable<CampaignStatus> ApplyReadRowAuthorization(IQueryable<CampaignStatus> query)
    {
        if (CanReadAll())
        {
            return query;
        }

        if (!CanReadOwn())
        {
            return query.Where(_ => false);
        }

        var ownIds = GetCurrentOwnIds();
        if (ownIds.Count == 0)
        {
            return query.Where(_ => false);
        }

        return query.Where(item => false);
    }

    private bool CanAccessRead(CampaignStatus entity)
    {
        if (CanReadAll())
        {
            return true;
        }

        if (!CanReadOwn())
        {
            return false;
        }

        var ownIds = GetCurrentOwnIds();
        if (ownIds.Count == 0)
        {
            return false;
        }

        return false;
    }

    private bool CanAccessUpdate(CampaignStatus entity)
    {
        if (CanUpdateAll())
        {
            return true;
        }

        if (!CanUpdateOwn())
        {
            return false;
        }

        var ownIds = GetCurrentOwnIds();
        if (ownIds.Count == 0)
        {
            return false;
        }

        return false;
    }

    private bool CanAccessDelete(CampaignStatus entity)
    {
        if (CanDeleteAll())
        {
            return true;
        }

        if (!CanDeleteOwn())
        {
            return false;
        }

        var ownIds = GetCurrentOwnIds();
        if (ownIds.Count == 0)
        {
            return false;
        }

        return false;
    }

    private HashSet<Guid> GetCurrentOwnIds()
    {
        var ids = new HashSet<Guid>();
        var userId = GetCurrentUserId();
        if (userId.HasValue)
        {
            ids.Add(userId.Value);
        }

        AddClaimGuids(ids, "ownerId");
        AddClaimGuids(ids, "ownerIds");
        AddClaimGuids(ids, "positionId");
        AddClaimGuids(ids, "positionIds");
        AddClaimGuids(ids, "staffPositionId");
        AddClaimGuids(ids, "staffPositionIds");
        AddClaimGuids(ids, "staff_position");
        AddClaimGuids(ids, "staff_positions");

        return ids;
    }

    private Guid? GetCurrentAuditPositionId()
    {
        var claimPositionIds = new HashSet<Guid>();
        AddClaimGuids(claimPositionIds, "currentPositionId");
        AddClaimGuids(claimPositionIds, "currentStaffPositionId");
        AddClaimGuids(claimPositionIds, "positionId");
        AddClaimGuids(claimPositionIds, "staffPositionId");
        if (claimPositionIds.Count == 1)
        {
            return claimPositionIds.Single();
        }

        return null;
    }

    private void AddClaimGuids(HashSet<Guid> ids, string claimType)
    {
        foreach (var claim in User.FindAll(claimType))
        {
            foreach (var rawValue in claim.Value.Split(' ', ',', ';'))
            {
                if (Guid.TryParse(rawValue.Trim(), out var id))
                {
                    ids.Add(id);
                }
            }
        }
    }



    private bool IsAuthenticatedUser()
    {
        return User.Identity?.IsAuthenticated == true && GetCurrentUserId().HasValue;
    }

    private bool HasEffectiveRole(string roleCode)
    {
        return false;
    }

    private bool HasEffectivePermission(string permissionCode)
    {
        return false;
    }

    private bool HasAnyActiveStaffPosition(params string[] positionCodes)
    {
        return false;
    }

    private bool HasAnyRole(params string[] roles)
    {
        foreach (var role in roles)
        {
            if (User.IsInRole(role)
                || HasClaimValue(ClaimTypes.Role, role)
                || HasClaimValue("role", role)
                || HasClaimValue("roles", role)
                || HasEffectiveRole(role))
            {
                return true;
            }
        }

        return false;
    }

    private bool HasPermission(string permissionCode)
    {
        return HasClaimValue("permission", permissionCode)
            || HasClaimValue("permissions", permissionCode)
            || HasClaimValue("scope", permissionCode)
            || HasEffectivePermission(permissionCode);
    }

    private bool HasClaimValue(string claimType, string expectedValue)
    {
        foreach (var claim in User.FindAll(claimType))
        {
            foreach (var value in claim.Value.Split(' ', ',', ';'))
            {
                if (string.Equals(value.Trim(), expectedValue, StringComparison.OrdinalIgnoreCase))
                {
                    return true;
                }
            }
        }

        return false;
    }

    private ActionResult? ToValidationError(RestCrudValidationResult result)
    {
        ArgumentNullException.ThrowIfNull(result);
        if (result.IsValid)
        {
            return null;
        }

        if (result.FailureKind is null || string.IsNullOrWhiteSpace(result.Code))
        {
            throw new InvalidOperationException("Invalid REST CRUD validation result.");
        }

        var payload = new
        {
            code = result.Code,
            target = result.Target,
            retryable = result.Retryable,
        };
        return result.FailureKind.Value switch
        {
            RestCrudValidationFailureKind.Validation => BadRequest(payload),
            RestCrudValidationFailureKind.Forbidden => StatusCode(StatusCodes.Status403Forbidden, payload),
            RestCrudValidationFailureKind.NotFound => NotFound(payload),
            RestCrudValidationFailureKind.Conflict => Conflict(payload),
            _ => throw new InvalidOperationException("Unsupported REST CRUD validation failure kind."),
        };
    }

    private ActionResult? TryResolveMutationIdempotencyKey(out string? idempotencyKey)
    {
        if (!RequireMutationIdempotencyKey)
        {
            idempotencyKey = null;
            return null;
        }

        var values = Request.Headers["Idempotency-Key"];
        if (values.Count == 0)
        {
            idempotencyKey = null;
            return RequireMutationIdempotencyKey
                ? BadRequest(new { code = CampaignStatusApiErrorCodes.IdempotencyKeyRequired })
                : null;
        }

        var value = values.ToString();
        if (values.Count != 1 || !IsValidIdempotencyKey(value))
        {
            idempotencyKey = null;
            return BadRequest(new { code = CampaignStatusApiErrorCodes.IdempotencyKeyInvalid });
        }

        idempotencyKey = value;
        return null;
    }

    private static bool IsValidIdempotencyKey(string value)
    {
        if (value.Length is < 1 or > 200)
        {
            return false;
        }

        foreach (var character in value)
        {
            if (character < '!' || character > '~' || character == ',')
            {
                return false;
            }
        }

        return true;
    }

    private string GetCurrentMutationSubjectKey()
    {
        var value = User.FindFirst(ClaimTypes.NameIdentifier)?.Value
            ?? User.FindFirst("sub")?.Value;
        if (string.IsNullOrWhiteSpace(value))
        {
            throw new InvalidOperationException("Authenticated subject is required for REST mutation idempotency.");
        }
        return value.Trim();
    }

    private Guid? GetCurrentUserId()
    {
        var value = User.FindFirst(ClaimTypes.NameIdentifier)?.Value
            ?? User.FindFirst("sub")?.Value;
        return Guid.TryParse(value, out var userId) ? userId : null;
    }

    private void AddWarnings(IReadOnlyList<string> warnings)
    {
        if (warnings.Count > 0)
        {
            Response.Headers["X-AppForge-Warnings"] = string.Join(",", warnings);
        }
    }
}
