#nullable enable

using Demo.BusinessOperations.Api.Contracts;
using Demo.BusinessOperations.Auth;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Demo.BusinessOperations.Api.Controllers;

[Authorize(Roles = "Admin")]
[ApiController]
[Route("api/admin/identity")]
public sealed class AuthAdminController : ControllerBase
{
    private readonly AdminUserService _service;
    private readonly IdentityAuditService _audit;
    private readonly Microsoft.Extensions.Configuration.IConfiguration _configuration;
    private readonly Microsoft.Extensions.Hosting.IHostEnvironment _environment;

    public AuthAdminController(
        AdminUserService service,
        IdentityAuditService audit,
        Microsoft.Extensions.Configuration.IConfiguration configuration,
        Microsoft.Extensions.Hosting.IHostEnvironment environment)
    {
        _service = service;
        _audit = audit;
        _configuration = configuration;
        _environment = environment;
    }

    [HttpGet("users")]
    public async Task<IReadOnlyList<AdminUserDto>> Users(
        [FromQuery] string? query,
        CancellationToken ct)
    {
        return await _service.ListUsersAsync(query, ct);
    }

    [HttpGet("users/{userId:guid}/effective-access")]
    public async Task<ActionResult<AdminEffectiveAccessDto>> EffectiveAccess(Guid userId, CancellationToken ct)
    {
        var result = await _service.GetEffectiveAccessAsync(userId, ct);
        return result is null ? NotFound() : Ok(result);
    }

    [HttpPost("users")]
    public async Task<ActionResult<AdminUserDto>> CreateUser(
        CreateAdminUserRequest request,
        CancellationToken ct)
    {
        var result = await _service.CreateUserAsync(request, ct);
        return result is null ? BadRequest(new { error = "User was not created." }) : Ok(result);
    }

    [HttpGet("features")]
    public ActionResult<AppAuthFeatureDiagnosticsDto> Features()
    {
        return Ok(AuthFeatureOptionsExtensions.GetDiagnostics(_configuration));
    }

    [HttpGet("audit")]
    public async Task<IReadOnlyList<AdminIdentityAuditLogDto>> Audit(CancellationToken ct)
    {
        return await _audit.ListAsync(200, ct);
    }

    [HttpGet("email-provider/diagnostics")]
    public ActionResult<AppEmailProviderDiagnosticsDto> EmailProviderDiagnostics()
    {
        return Ok(EmailServiceCollectionExtensions.GetDiagnostics(
            _configuration,
            emailFeaturesEnabled: true,
            isProduction: _environment.EnvironmentName.Equals("Production", StringComparison.OrdinalIgnoreCase)));
    }

    [HttpGet("email-confirmations")]
    public async Task<IReadOnlyList<AdminEmailConfirmationDto>> EmailConfirmations(CancellationToken ct)
    {
        return await _service.ListEmailConfirmationsAsync(ct);
    }

    [HttpPost("users/{userId:guid}/email-confirmation")]
    public async Task<IActionResult> SendEmailConfirmation(Guid userId, CancellationToken ct)
    {
        return await _service.SendEmailConfirmationAsync(userId, ct) ? NoContent() : NotFound();
    }

    [HttpPost("email-confirmations/{userId:guid}/send")]
    public async Task<IActionResult> SendEmailConfirmationFromQueue(Guid userId, CancellationToken ct)
    {
        return await _service.SendEmailConfirmationAsync(userId, ct) ? NoContent() : NotFound();
    }

    [HttpGet("invitations")]
    public async Task<IReadOnlyList<AdminUserInvitationDto>> Invitations(CancellationToken ct)
    {
        return await _service.ListInvitationsAsync(ct);
    }

    [HttpPost("invitations")]
    public async Task<ActionResult<AdminUserInvitationDto>> CreateInvitation(
        CreateUserInvitationRequest request,
        CancellationToken ct)
    {
        var result = await _service.CreateInvitationAsync(request, ct);
        return result is null ? BadRequest(new { error = "Invitation was not created." }) : Ok(result);
    }

    [HttpPost("invitations/{invitationId:guid}/resend")]
    public async Task<ActionResult<AdminUserInvitationDto>> ResendInvitation(Guid invitationId, CancellationToken ct)
    {
        var result = await _service.ResendInvitationAsync(invitationId, ct);
        return result is null ? NotFound() : Ok(result);
    }

    [HttpGet("roles")]
    public async Task<IReadOnlyList<AdminRoleDto>> Roles(CancellationToken ct)
    {
        return await _service.ListRolesAsync(ct);
    }

    [HttpPost("users/{userId:guid}/roles")]
    public async Task<IActionResult> AssignRole(
        Guid userId,
        AssignUserRoleRequest request,
        CancellationToken ct)
    {
        return await _service.AssignRoleAsync(userId, request.RoleCode, ct) ? NoContent() : NotFound();
    }



}
