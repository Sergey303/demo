using Demo.BusinessOperations;
using Microsoft.EntityFrameworkCore;

namespace Demo.BusinessOperations.Persistence;

public sealed partial class BusinessOperationsAdminDbContext : DbContext
{
    public BusinessOperationsAdminDbContext(DbContextOptions<BusinessOperationsAdminDbContext> options)
        : base(options)
    {
    }

    public DbSet<Customer> Customers => Set<Customer>();
    public DbSet<ServiceRequest> ServiceRequests => Set<ServiceRequest>();
    public DbSet<WorkItem> WorkItems => Set<WorkItem>();
    public DbSet<Role> Roles => Set<Role>();
    public DbSet<Permission> Permissions => Set<Permission>();
    public DbSet<RolePermission> RolePermissions => Set<RolePermission>();
    public DbSet<AppUser> AppUsers => Set<AppUser>();
    public DbSet<AppUserRole> AppUserRoles => Set<AppUserRole>();
    public DbSet<AppUserSession> AppUserSessions => Set<AppUserSession>();
    public DbSet<AuthLoginAttempt> AuthLoginAttempts => Set<AuthLoginAttempt>();
    public DbSet<PasswordResetToken> PasswordResetTokens => Set<PasswordResetToken>();
    public DbSet<AccountRecoveryAttempt> AccountRecoveryAttempts => Set<AccountRecoveryAttempt>();
    public DbSet<PublicRegistrationAttempt> PublicRegistrationAttempts => Set<PublicRegistrationAttempt>();
    public DbSet<UserInvitation> UserInvitations => Set<UserInvitation>();
    public DbSet<EmailConfirmationToken> EmailConfirmationTokens => Set<EmailConfirmationToken>();
    public DbSet<IdentityAuditLog> IdentityAuditLogs => Set<IdentityAuditLog>();
    public DbSet<AppForgeSeedHistory> AppForgeSeedHistory => Set<AppForgeSeedHistory>();
    public DbSet<AppForgeRestMutationReceipt> AppForgeRestMutationReceipts => Set<AppForgeRestMutationReceipt>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        ArgumentNullException.ThrowIfNull(modelBuilder);
        base.OnModelCreating(modelBuilder);
        modelBuilder.ApplyConfiguration(new Configurations.CustomerConfiguration());
        modelBuilder.ApplyConfiguration(new Configurations.ServiceRequestConfiguration());
        modelBuilder.ApplyConfiguration(new Configurations.WorkItemConfiguration());
        modelBuilder.ApplyConfiguration(new Configurations.RoleConfiguration());
        modelBuilder.ApplyConfiguration(new Configurations.PermissionConfiguration());
        modelBuilder.ApplyConfiguration(new Configurations.RolePermissionConfiguration());
        modelBuilder.ApplyConfiguration(new Configurations.AppUserConfiguration());
        modelBuilder.ApplyConfiguration(new Configurations.AppUserRoleConfiguration());
        modelBuilder.ApplyConfiguration(new Configurations.AppUserSessionConfiguration());
        modelBuilder.ApplyConfiguration(new Configurations.AuthLoginAttemptConfiguration());
        modelBuilder.ApplyConfiguration(new Configurations.PasswordResetTokenConfiguration());
        modelBuilder.ApplyConfiguration(new Configurations.AccountRecoveryAttemptConfiguration());
        modelBuilder.ApplyConfiguration(new Configurations.PublicRegistrationAttemptConfiguration());
        modelBuilder.ApplyConfiguration(new Configurations.UserInvitationConfiguration());
        modelBuilder.ApplyConfiguration(new Configurations.EmailConfirmationTokenConfiguration());
        modelBuilder.ApplyConfiguration(new Configurations.IdentityAuditLogConfiguration());
        modelBuilder.ApplyConfiguration(new Configurations.AppForgeSeedHistoryConfiguration());
        modelBuilder.ApplyConfiguration(new Configurations.AppForgeRestMutationReceiptConfiguration());
        OnModelCreatingCustom(modelBuilder);
    }

    partial void OnModelCreatingCustom(ModelBuilder modelBuilder);
}
