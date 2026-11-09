#nullable enable

using Demo.TelegramOperations.Persistence;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace Demo.TelegramOperations.Auth;

public static class AuthSeedService
{
    private const string AdminRoleCode = "Admin";
    private const string ProductionSentinelPrefix = "__APPFORGE_SET_";

    public static async Task SeedAsync(TelegramOperationsAdminDbContext db, IConfiguration configuration, CancellationToken ct)
    {
        var adminEmail = configuration["APPFORGE_ADMIN_EMAIL"]
            ?? Environment.GetEnvironmentVariable("APPFORGE_ADMIN_EMAIL");
        var adminPassword = configuration["APPFORGE_ADMIN_PASSWORD"]
            ?? Environment.GetEnvironmentVariable("APPFORGE_ADMIN_PASSWORD");
        if (string.IsNullOrWhiteSpace(adminEmail) || string.IsNullOrWhiteSpace(adminPassword))
        {
            throw new InvalidOperationException(
                "Production seed admin requires APPFORGE_ADMIN_EMAIL and APPFORGE_ADMIN_PASSWORD.");
        }

        if (IsProductionSentinel(adminEmail.Trim()) || IsProductionSentinel(adminPassword))
        {
            throw new InvalidOperationException(
                "Production seed admin requires real APPFORGE_ADMIN_EMAIL and APPFORGE_ADMIN_PASSWORD values. __APPFORGE_SET_* sentinels are not valid seed credentials.");
        }

        await SeedCoreAsync(db, adminEmail.Trim(), adminPassword, mustChangePassword: true, ct);
    }

    private static bool IsProductionSentinel(string value)
    {
        return value.StartsWith(ProductionSentinelPrefix, StringComparison.Ordinal);
    }

    private static async Task SeedCoreAsync(
        TelegramOperationsAdminDbContext db,
        string adminEmail,
        string adminPassword,
        bool mustChangePassword,
        CancellationToken ct)
    {
        var adminRole = await EnsureRoleAsync(db, AdminRoleCode, "Administrator", ct);
        await EnsurePermissionAsync(db, "Campaign.Create", "Campaign.Create", ct);
        await EnsurePermissionAsync(db, "Campaign.Delete", "Campaign.Delete", ct);
        await EnsurePermissionAsync(db, "Campaign.Read", "Campaign.Read", ct);
        await EnsurePermissionAsync(db, "Campaign.Update", "Campaign.Update", ct);
        await EnsurePermissionAsync(db, "Lead.Create", "Lead.Create", ct);
        await EnsurePermissionAsync(db, "Lead.Delete", "Lead.Delete", ct);
        await EnsurePermissionAsync(db, "Lead.Read", "Lead.Read", ct);
        await EnsurePermissionAsync(db, "Lead.Update", "Lead.Update", ct);
        await EnsurePermissionAsync(db, "Subscriber.Create", "Subscriber.Create", ct);
        await EnsurePermissionAsync(db, "Subscriber.Delete", "Subscriber.Delete", ct);
        await EnsurePermissionAsync(db, "Subscriber.Read", "Subscriber.Read", ct);
        await EnsurePermissionAsync(db, "Subscriber.Update", "Subscriber.Update", ct);
        var permissions = await db.Permissions.ToListAsync(ct);
        foreach (var permission in permissions)
        {
            await EnsureRolePermissionAsync(db, adminRole, permission, ct);
        }
        await EnsureAdminAsync(db, adminRole, adminEmail, adminPassword, mustChangePassword, ct);
        await db.SaveChangesAsync(ct);
    }


    private static async Task<Role> EnsureRoleAsync(TelegramOperationsAdminDbContext db, string code, string name, CancellationToken ct)
    {
        var role = await db.Roles.SingleOrDefaultAsync(x => x.Code == code, ct);
        if (role is not null) return role;
        role = new Role { Id = Guid.NewGuid(), Code = code, Name = name };
        db.Roles.Add(role);
        return role;
    }

    private static async Task<Permission> EnsurePermissionAsync(TelegramOperationsAdminDbContext db, string code, string name, CancellationToken ct)
    {
        var permission = await db.Permissions.SingleOrDefaultAsync(x => x.Code == code, ct);
        if (permission is not null) return permission;
        permission = new Permission { Id = Guid.NewGuid(), Code = code, Name = name };
        db.Permissions.Add(permission);
        return permission;
    }

    private static async Task EnsureRolePermissionAsync(
        TelegramOperationsAdminDbContext db,
        Role role,
        Permission permission,
        CancellationToken ct)
    {
        var exists = await db.RolePermissions.AnyAsync(x => x.RoleId == role.Id && x.PermissionId == permission.Id, ct);
        if (!exists)
        {
            db.RolePermissions.Add(new RolePermission { Id = Guid.NewGuid(), RoleId = role.Id, PermissionId = permission.Id });
        }
    }

    private static async Task EnsureAdminAsync(
        TelegramOperationsAdminDbContext db,
        Role adminRole,
        string email,
        string password,
        bool mustChangePassword,
        CancellationToken ct)
    {
        var user = await db.AppUsers.SingleOrDefaultAsync(x => x.Email == email, ct);
        if (user is null)
        {
            var now = DateTime.UtcNow;
            user = new AppUser
            {
                Id = Guid.NewGuid(),
                Email = email,
                UserName = email,
                EmailConfirmed = true,
                IsActive = true,
                MustChangePassword = mustChangePassword,
                CreatedAtUtc = now,
                UpdatedAtUtc = now,
            };
            user.PasswordHash = new PasswordHasher<AppUser>().HashPassword(user, password);
            db.AppUsers.Add(user);
        }
        var hasRole = await db.AppUserRoles.AnyAsync(x => x.AppUserId == user.Id && x.RoleId == adminRole.Id, ct);
        if (!hasRole)
        {
            db.AppUserRoles.Add(new AppUserRole { Id = Guid.NewGuid(), AppUserId = user.Id, RoleId = adminRole.Id });
        }
    }
}
