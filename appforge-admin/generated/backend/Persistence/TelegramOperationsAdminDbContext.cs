using Demo.TelegramOperations;
using Microsoft.EntityFrameworkCore;

namespace Demo.TelegramOperations.Persistence;

public sealed partial class TelegramOperationsAdminDbContext : DbContext
{
    public TelegramOperationsAdminDbContext(DbContextOptions<TelegramOperationsAdminDbContext> options)
        : base(options)
    {
    }

    public DbSet<Subscriber> Subscribers => Set<Subscriber>();
    public DbSet<SubscriberStatus> SubscriberStatuses => Set<SubscriberStatus>();
    public DbSet<Lead> Leads => Set<Lead>();
    public DbSet<LeadStatus> LeadStatuses => Set<LeadStatus>();
    public DbSet<Campaign> Campaigns => Set<Campaign>();
    public DbSet<CampaignStatus> CampaignStatuses => Set<CampaignStatus>();
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
        modelBuilder.ApplyConfiguration(new Configurations.SubscriberConfiguration());
        modelBuilder.ApplyConfiguration(new Configurations.SubscriberStatusConfiguration());
        modelBuilder.ApplyConfiguration(new Configurations.LeadConfiguration());
        modelBuilder.ApplyConfiguration(new Configurations.LeadStatusConfiguration());
        modelBuilder.ApplyConfiguration(new Configurations.CampaignConfiguration());
        modelBuilder.ApplyConfiguration(new Configurations.CampaignStatusConfiguration());
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
