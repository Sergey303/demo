using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BusinessOperationsAdmin.Migrations
{
    /// <inheritdoc />
    public partial class AppForgeGeneratedInitial : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "__AppForgeRestMutationReceipts",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    SubjectKey = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: false),
                    EndpointKey = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    IdempotencyKey = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    RequestFingerprint = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    ResponseJson = table.Column<string>(type: "text", nullable: true),
                    CreatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK___AppForgeRestMutationReceipts", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "AccountRecoveryAttempts",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    EmailHash = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: false),
                    IpHash = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AccountRecoveryAttempts", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "AppUserRoles",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    AppUserId = table.Column<Guid>(type: "uuid", nullable: false),
                    RoleId = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AppUserRoles", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "AppUsers",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Email = table.Column<string>(type: "character varying(320)", maxLength: 320, nullable: false),
                    UserName = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    PasswordHash = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: false),
                    EmailConfirmed = table.Column<bool>(type: "boolean", nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    MustChangePassword = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AppUsers", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "AppUserSessions",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    AppUserId = table.Column<Guid>(type: "uuid", nullable: false),
                    AccessTokenHash = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: false),
                    RefreshTokenHash = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: false),
                    AccessTokenExpiresAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    RefreshTokenExpiresAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    RevokedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    CreatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AppUserSessions", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "AuthLoginAttempts",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    LoginHash = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: false),
                    IpHash = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: false),
                    Succeeded = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AuthLoginAttempts", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Customers",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Name = table.Column<string>(type: "character varying(180)", maxLength: 180, nullable: false),
                    Email = table.Column<string>(type: "character varying(180)", maxLength: 180, nullable: true),
                    Segment = table.Column<string>(type: "character varying(90)", maxLength: 90, nullable: true),
                    Note = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    CreationTime = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    CreatorId = table.Column<Guid>(type: "uuid", nullable: true),
                    CreatorPositionId = table.Column<Guid>(type: "uuid", nullable: true),
                    LastModificationTime = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    LastModifierId = table.Column<Guid>(type: "uuid", nullable: true),
                    LastModifierPositionId = table.Column<Guid>(type: "uuid", nullable: true),
                    IsDeleted = table.Column<bool>(type: "boolean", nullable: false, defaultValue: false),
                    DeletionTime = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    DeleterId = table.Column<Guid>(type: "uuid", nullable: true),
                    DeleterPositionId = table.Column<Guid>(type: "uuid", nullable: true),
                    NameSearch = table.Column<string>(type: "character varying(180)", maxLength: 180, nullable: false),
                    EmailSearch = table.Column<string>(type: "character varying(180)", maxLength: 180, nullable: false),
                    SegmentSearch = table.Column<string>(type: "character varying(90)", maxLength: 90, nullable: false),
                    NoteSearch = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Customers", x => x.Id);
                    table.CheckConstraint("CK_Customers_Email_Standard", "\"Email\" IS NULL OR (LENGTH(\"Email\") <= 180)");
                    table.CheckConstraint("CK_Customers_Name_Standard", "LENGTH(\"Name\") <= 180");
                    table.CheckConstraint("CK_Customers_Note_Standard", "\"Note\" IS NULL OR (LENGTH(\"Note\") <= 500)");
                    table.CheckConstraint("CK_Customers_Segment_Standard", "\"Segment\" IS NULL OR (LENGTH(\"Segment\") <= 90)");
                });

            migrationBuilder.CreateTable(
                name: "EmailConfirmationTokens",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    AppUserId = table.Column<Guid>(type: "uuid", nullable: false),
                    TokenHash = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: false),
                    ExpiresAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UsedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    CreatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_EmailConfirmationTokens", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "IdentityAuditLogs",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    Action = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: false),
                    ActorUserId = table.Column<Guid>(type: "uuid", nullable: true),
                    ActorEmail = table.Column<string>(type: "character varying(320)", maxLength: 320, nullable: false),
                    TargetUserId = table.Column<Guid>(type: "uuid", nullable: true),
                    TargetEmail = table.Column<string>(type: "character varying(320)", maxLength: 320, nullable: false),
                    Details = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_IdentityAuditLogs", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "PasswordResetTokens",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    AppUserId = table.Column<Guid>(type: "uuid", nullable: false),
                    TokenHash = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: false),
                    ExpiresAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UsedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    CreatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PasswordResetTokens", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Permissions",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Code = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Permissions", x => x.Id);
                    table.CheckConstraint("CK_Permissions_Code_Standard", "LENGTH(\"Code\") <= 200");
                    table.CheckConstraint("CK_Permissions_Name_Standard", "LENGTH(\"Name\") <= 200");
                });

            migrationBuilder.CreateTable(
                name: "PublicRegistrationAttempts",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    EmailHash = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: false),
                    IpHash = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: false),
                    Succeeded = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PublicRegistrationAttempts", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Roles",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Code = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: false),
                    Name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Roles", x => x.Id);
                    table.CheckConstraint("CK_Roles_Code_Standard", "LENGTH(\"Code\") <= 128");
                    table.CheckConstraint("CK_Roles_Name_Standard", "LENGTH(\"Name\") <= 200");
                });

            migrationBuilder.CreateTable(
                name: "UserInvitations",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Email = table.Column<string>(type: "character varying(320)", maxLength: 320, nullable: false),
                    TokenHash = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: false),
                    RoleCodes = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: false),
                    ExpiresAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    AcceptedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    CreatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_UserInvitations", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "ServiceRequests",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    CustomerId = table.Column<Guid>(type: "uuid", nullable: false),
                    Title = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Priority = table.Column<string>(type: "character varying(24)", maxLength: 24, nullable: true),
                    Description = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    CreationTime = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    CreatorId = table.Column<Guid>(type: "uuid", nullable: true),
                    CreatorPositionId = table.Column<Guid>(type: "uuid", nullable: true),
                    LastModificationTime = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    LastModifierId = table.Column<Guid>(type: "uuid", nullable: true),
                    LastModifierPositionId = table.Column<Guid>(type: "uuid", nullable: true),
                    IsDeleted = table.Column<bool>(type: "boolean", nullable: false, defaultValue: false),
                    DeletionTime = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    DeleterId = table.Column<Guid>(type: "uuid", nullable: true),
                    DeleterPositionId = table.Column<Guid>(type: "uuid", nullable: true),
                    TitleSearch = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    PrioritySearch = table.Column<string>(type: "character varying(24)", maxLength: 24, nullable: false),
                    DescriptionSearch = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ServiceRequests", x => x.Id);
                    table.CheckConstraint("CK_ServiceRequests_Description_Standard", "\"Description\" IS NULL OR (LENGTH(\"Description\") <= 1000)");
                    table.CheckConstraint("CK_ServiceRequests_Priority_Standard", "\"Priority\" IS NULL OR (LENGTH(\"Priority\") <= 24)");
                    table.CheckConstraint("CK_ServiceRequests_Title_Standard", "LENGTH(\"Title\") <= 200");
                    table.ForeignKey(
                        name: "FK_ServiceRequests_Customers_CustomerId",
                        column: x => x.CustomerId,
                        principalTable: "Customers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "RolePermissions",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    RoleId = table.Column<Guid>(type: "uuid", nullable: false),
                    PermissionId = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_RolePermissions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_RolePermissions_Permissions_PermissionId",
                        column: x => x.PermissionId,
                        principalTable: "Permissions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_RolePermissions_Roles_RoleId",
                        column: x => x.RoleId,
                        principalTable: "Roles",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "WorkItems",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ServiceRequestId = table.Column<Guid>(type: "uuid", nullable: false),
                    Title = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Assignee = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: true),
                    Status = table.Column<string>(type: "character varying(36)", maxLength: 36, nullable: true),
                    Note = table.Column<string>(type: "character varying(700)", maxLength: 700, nullable: true),
                    CreationTime = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    CreatorId = table.Column<Guid>(type: "uuid", nullable: true),
                    CreatorPositionId = table.Column<Guid>(type: "uuid", nullable: true),
                    LastModificationTime = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    LastModifierId = table.Column<Guid>(type: "uuid", nullable: true),
                    LastModifierPositionId = table.Column<Guid>(type: "uuid", nullable: true),
                    IsDeleted = table.Column<bool>(type: "boolean", nullable: false, defaultValue: false),
                    DeletionTime = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    DeleterId = table.Column<Guid>(type: "uuid", nullable: true),
                    DeleterPositionId = table.Column<Guid>(type: "uuid", nullable: true),
                    TitleSearch = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    AssigneeSearch = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: false),
                    StatusSearch = table.Column<string>(type: "character varying(36)", maxLength: 36, nullable: false),
                    NoteSearch = table.Column<string>(type: "character varying(700)", maxLength: 700, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_WorkItems", x => x.Id);
                    table.CheckConstraint("CK_WorkItems_Assignee_Standard", "\"Assignee\" IS NULL OR (LENGTH(\"Assignee\") <= 120)");
                    table.CheckConstraint("CK_WorkItems_Note_Standard", "\"Note\" IS NULL OR (LENGTH(\"Note\") <= 700)");
                    table.CheckConstraint("CK_WorkItems_Status_Standard", "\"Status\" IS NULL OR (LENGTH(\"Status\") <= 36)");
                    table.CheckConstraint("CK_WorkItems_Title_Standard", "LENGTH(\"Title\") <= 200");
                    table.ForeignKey(
                        name: "FK_WorkItems_ServiceRequests_ServiceRequestId",
                        column: x => x.ServiceRequestId,
                        principalTable: "ServiceRequests",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX___AppForgeRestMutationReceipts_CreatedAtUtc",
                table: "__AppForgeRestMutationReceipts",
                column: "CreatedAtUtc");

            migrationBuilder.CreateIndex(
                name: "IX___AppForgeRestMutationReceipts_Subject_Endpoint_Idempotency",
                table: "__AppForgeRestMutationReceipts",
                columns: new[] { "SubjectKey", "EndpointKey", "IdempotencyKey" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_AccountRecoveryAttempts_CreatedAtUtc",
                table: "AccountRecoveryAttempts",
                column: "CreatedAtUtc");

            migrationBuilder.CreateIndex(
                name: "IX_AccountRecoveryAttempts_EmailHash",
                table: "AccountRecoveryAttempts",
                column: "EmailHash");

            migrationBuilder.CreateIndex(
                name: "IX_AccountRecoveryAttempts_IpHash",
                table: "AccountRecoveryAttempts",
                column: "IpHash");

            migrationBuilder.CreateIndex(
                name: "IX_AppUserRoles_AppUserId_RoleId",
                table: "AppUserRoles",
                columns: new[] { "AppUserId", "RoleId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_AppUsers_Email",
                table: "AppUsers",
                column: "Email",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_AppUsers_UserName",
                table: "AppUsers",
                column: "UserName",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_AppUserSessions_AccessTokenHash",
                table: "AppUserSessions",
                column: "AccessTokenHash",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_AppUserSessions_AppUserId",
                table: "AppUserSessions",
                column: "AppUserId");

            migrationBuilder.CreateIndex(
                name: "IX_AppUserSessions_RefreshTokenHash",
                table: "AppUserSessions",
                column: "RefreshTokenHash",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_AuthLoginAttempts_CreatedAtUtc",
                table: "AuthLoginAttempts",
                column: "CreatedAtUtc");

            migrationBuilder.CreateIndex(
                name: "IX_AuthLoginAttempts_IpHash",
                table: "AuthLoginAttempts",
                column: "IpHash");

            migrationBuilder.CreateIndex(
                name: "IX_AuthLoginAttempts_LoginHash",
                table: "AuthLoginAttempts",
                column: "LoginHash");

            migrationBuilder.CreateIndex(
                name: "IX_Customers_Email",
                table: "Customers",
                column: "Email");

            migrationBuilder.CreateIndex(
                name: "IX_Customers_EmailSearch",
                table: "Customers",
                column: "EmailSearch");

            migrationBuilder.CreateIndex(
                name: "IX_Customers_IsDeleted",
                table: "Customers",
                column: "IsDeleted");

            migrationBuilder.CreateIndex(
                name: "IX_Customers_Name",
                table: "Customers",
                column: "Name");

            migrationBuilder.CreateIndex(
                name: "IX_Customers_NameSearch",
                table: "Customers",
                column: "NameSearch");

            migrationBuilder.CreateIndex(
                name: "IX_Customers_NoteSearch",
                table: "Customers",
                column: "NoteSearch");

            migrationBuilder.CreateIndex(
                name: "IX_Customers_SegmentSearch",
                table: "Customers",
                column: "SegmentSearch");

            migrationBuilder.CreateIndex(
                name: "IX_EmailConfirmationTokens_AppUserId",
                table: "EmailConfirmationTokens",
                column: "AppUserId");

            migrationBuilder.CreateIndex(
                name: "IX_EmailConfirmationTokens_TokenHash",
                table: "EmailConfirmationTokens",
                column: "TokenHash",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_IdentityAuditLogs_Action",
                table: "IdentityAuditLogs",
                column: "Action");

            migrationBuilder.CreateIndex(
                name: "IX_IdentityAuditLogs_ActorUserId",
                table: "IdentityAuditLogs",
                column: "ActorUserId");

            migrationBuilder.CreateIndex(
                name: "IX_IdentityAuditLogs_CreatedAtUtc",
                table: "IdentityAuditLogs",
                column: "CreatedAtUtc");

            migrationBuilder.CreateIndex(
                name: "IX_IdentityAuditLogs_TargetUserId",
                table: "IdentityAuditLogs",
                column: "TargetUserId");

            migrationBuilder.CreateIndex(
                name: "IX_PasswordResetTokens_AppUserId",
                table: "PasswordResetTokens",
                column: "AppUserId");

            migrationBuilder.CreateIndex(
                name: "IX_PasswordResetTokens_TokenHash",
                table: "PasswordResetTokens",
                column: "TokenHash",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Permissions_Code",
                table: "Permissions",
                column: "Code",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_PublicRegistrationAttempts_CreatedAtUtc",
                table: "PublicRegistrationAttempts",
                column: "CreatedAtUtc");

            migrationBuilder.CreateIndex(
                name: "IX_PublicRegistrationAttempts_EmailHash",
                table: "PublicRegistrationAttempts",
                column: "EmailHash");

            migrationBuilder.CreateIndex(
                name: "IX_PublicRegistrationAttempts_IpHash",
                table: "PublicRegistrationAttempts",
                column: "IpHash");

            migrationBuilder.CreateIndex(
                name: "IX_RolePermissions_PermissionId",
                table: "RolePermissions",
                column: "PermissionId");

            migrationBuilder.CreateIndex(
                name: "IX_RolePermissions_RoleId_PermissionId",
                table: "RolePermissions",
                columns: new[] { "RoleId", "PermissionId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Roles_Code",
                table: "Roles",
                column: "Code",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ServiceRequests_CustomerId",
                table: "ServiceRequests",
                column: "CustomerId");

            migrationBuilder.CreateIndex(
                name: "IX_ServiceRequests_DescriptionSearch",
                table: "ServiceRequests",
                column: "DescriptionSearch");

            migrationBuilder.CreateIndex(
                name: "IX_ServiceRequests_IsDeleted",
                table: "ServiceRequests",
                column: "IsDeleted");

            migrationBuilder.CreateIndex(
                name: "IX_ServiceRequests_PrioritySearch",
                table: "ServiceRequests",
                column: "PrioritySearch");

            migrationBuilder.CreateIndex(
                name: "IX_ServiceRequests_TitleSearch",
                table: "ServiceRequests",
                column: "TitleSearch");

            migrationBuilder.CreateIndex(
                name: "IX_UserInvitations_Email",
                table: "UserInvitations",
                column: "Email");

            migrationBuilder.CreateIndex(
                name: "IX_UserInvitations_TokenHash",
                table: "UserInvitations",
                column: "TokenHash",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_WorkItems_AssigneeSearch",
                table: "WorkItems",
                column: "AssigneeSearch");

            migrationBuilder.CreateIndex(
                name: "IX_WorkItems_IsDeleted",
                table: "WorkItems",
                column: "IsDeleted");

            migrationBuilder.CreateIndex(
                name: "IX_WorkItems_NoteSearch",
                table: "WorkItems",
                column: "NoteSearch");

            migrationBuilder.CreateIndex(
                name: "IX_WorkItems_ServiceRequestId",
                table: "WorkItems",
                column: "ServiceRequestId");

            migrationBuilder.CreateIndex(
                name: "IX_WorkItems_StatusSearch",
                table: "WorkItems",
                column: "StatusSearch");

            migrationBuilder.CreateIndex(
                name: "IX_WorkItems_TitleSearch",
                table: "WorkItems",
                column: "TitleSearch");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "__AppForgeRestMutationReceipts");

            migrationBuilder.DropTable(
                name: "AccountRecoveryAttempts");

            migrationBuilder.DropTable(
                name: "AppUserRoles");

            migrationBuilder.DropTable(
                name: "AppUsers");

            migrationBuilder.DropTable(
                name: "AppUserSessions");

            migrationBuilder.DropTable(
                name: "AuthLoginAttempts");

            migrationBuilder.DropTable(
                name: "EmailConfirmationTokens");

            migrationBuilder.DropTable(
                name: "IdentityAuditLogs");

            migrationBuilder.DropTable(
                name: "PasswordResetTokens");

            migrationBuilder.DropTable(
                name: "PublicRegistrationAttempts");

            migrationBuilder.DropTable(
                name: "RolePermissions");

            migrationBuilder.DropTable(
                name: "UserInvitations");

            migrationBuilder.DropTable(
                name: "WorkItems");

            migrationBuilder.DropTable(
                name: "Permissions");

            migrationBuilder.DropTable(
                name: "Roles");

            migrationBuilder.DropTable(
                name: "ServiceRequests");

            migrationBuilder.DropTable(
                name: "Customers");
        }
    }
}
