CREATE TABLE IF NOT EXISTS "__EFMigrationsHistory" (
    "MigrationId" character varying(150) NOT NULL,
    "ProductVersion" character varying(32) NOT NULL,
    CONSTRAINT "PK___EFMigrationsHistory" PRIMARY KEY ("MigrationId")
);

START TRANSACTION;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261109110358_AppForgeGeneratedInitial') THEN
    CREATE TABLE "__AppForgeRestMutationReceipts" (
        "Id" uuid NOT NULL,
        "SubjectKey" character varying(300) NOT NULL,
        "EndpointKey" character varying(500) NOT NULL,
        "IdempotencyKey" character varying(200) NOT NULL,
        "RequestFingerprint" character varying(64) NOT NULL,
        "ResponseJson" text,
        "CreatedAtUtc" timestamp with time zone NOT NULL,
        CONSTRAINT "PK___AppForgeRestMutationReceipts" PRIMARY KEY ("Id")
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261109110358_AppForgeGeneratedInitial') THEN
    CREATE TABLE "AccountRecoveryAttempts" (
        "Id" uuid NOT NULL,
        "EmailHash" character varying(128) NOT NULL,
        "IpHash" character varying(128) NOT NULL,
        "CreatedAtUtc" timestamp with time zone NOT NULL,
        CONSTRAINT "PK_AccountRecoveryAttempts" PRIMARY KEY ("Id")
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261109110358_AppForgeGeneratedInitial') THEN
    CREATE TABLE "AppUserRoles" (
        "Id" uuid NOT NULL,
        "AppUserId" uuid NOT NULL,
        "RoleId" uuid NOT NULL,
        CONSTRAINT "PK_AppUserRoles" PRIMARY KEY ("Id")
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261109110358_AppForgeGeneratedInitial') THEN
    CREATE TABLE "AppUsers" (
        "Id" uuid NOT NULL,
        "Email" character varying(320) NOT NULL,
        "UserName" character varying(200) NOT NULL,
        "PasswordHash" character varying(1000) NOT NULL,
        "EmailConfirmed" boolean NOT NULL,
        "IsActive" boolean NOT NULL,
        "MustChangePassword" boolean NOT NULL,
        "CreatedAtUtc" timestamp with time zone NOT NULL,
        "UpdatedAtUtc" timestamp with time zone NOT NULL,
        CONSTRAINT "PK_AppUsers" PRIMARY KEY ("Id")
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261109110358_AppForgeGeneratedInitial') THEN
    CREATE TABLE "AppUserSessions" (
        "Id" uuid NOT NULL,
        "AppUserId" uuid NOT NULL,
        "AccessTokenHash" character varying(128) NOT NULL,
        "RefreshTokenHash" character varying(128) NOT NULL,
        "AccessTokenExpiresAtUtc" timestamp with time zone NOT NULL,
        "RefreshTokenExpiresAtUtc" timestamp with time zone NOT NULL,
        "RevokedAtUtc" timestamp with time zone,
        "CreatedAtUtc" timestamp with time zone NOT NULL,
        CONSTRAINT "PK_AppUserSessions" PRIMARY KEY ("Id")
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261109110358_AppForgeGeneratedInitial') THEN
    CREATE TABLE "AuthLoginAttempts" (
        "Id" uuid NOT NULL,
        "LoginHash" character varying(128) NOT NULL,
        "IpHash" character varying(128) NOT NULL,
        "Succeeded" boolean NOT NULL,
        "CreatedAtUtc" timestamp with time zone NOT NULL,
        CONSTRAINT "PK_AuthLoginAttempts" PRIMARY KEY ("Id")
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261109110358_AppForgeGeneratedInitial') THEN
    CREATE TABLE "Customers" (
        "Id" uuid NOT NULL,
        "Name" character varying(180) NOT NULL,
        "Email" character varying(180),
        "Segment" character varying(90),
        "Note" character varying(500),
        "CreationTime" timestamp with time zone NOT NULL,
        "CreatorId" uuid,
        "CreatorPositionId" uuid,
        "LastModificationTime" timestamp with time zone,
        "LastModifierId" uuid,
        "LastModifierPositionId" uuid,
        "IsDeleted" boolean NOT NULL DEFAULT FALSE,
        "DeletionTime" timestamp with time zone,
        "DeleterId" uuid,
        "DeleterPositionId" uuid,
        "NameSearch" character varying(180) NOT NULL,
        "EmailSearch" character varying(180) NOT NULL,
        "SegmentSearch" character varying(90) NOT NULL,
        "NoteSearch" character varying(500) NOT NULL,
        CONSTRAINT "PK_Customers" PRIMARY KEY ("Id"),
        CONSTRAINT "CK_Customers_Email_Standard" CHECK ("Email" IS NULL OR (LENGTH("Email") <= 180)),
        CONSTRAINT "CK_Customers_Name_Standard" CHECK (LENGTH("Name") <= 180),
        CONSTRAINT "CK_Customers_Note_Standard" CHECK ("Note" IS NULL OR (LENGTH("Note") <= 500)),
        CONSTRAINT "CK_Customers_Segment_Standard" CHECK ("Segment" IS NULL OR (LENGTH("Segment") <= 90))
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261109110358_AppForgeGeneratedInitial') THEN
    CREATE TABLE "EmailConfirmationTokens" (
        "Id" uuid NOT NULL,
        "AppUserId" uuid NOT NULL,
        "TokenHash" character varying(128) NOT NULL,
        "ExpiresAtUtc" timestamp with time zone NOT NULL,
        "UsedAtUtc" timestamp with time zone,
        "CreatedAtUtc" timestamp with time zone NOT NULL,
        CONSTRAINT "PK_EmailConfirmationTokens" PRIMARY KEY ("Id")
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261109110358_AppForgeGeneratedInitial') THEN
    CREATE TABLE "IdentityAuditLogs" (
        "Id" uuid NOT NULL,
        "CreatedAtUtc" timestamp with time zone NOT NULL,
        "Action" character varying(120) NOT NULL,
        "ActorUserId" uuid,
        "ActorEmail" character varying(320) NOT NULL,
        "TargetUserId" uuid,
        "TargetEmail" character varying(320) NOT NULL,
        "Details" character varying(1000) NOT NULL,
        CONSTRAINT "PK_IdentityAuditLogs" PRIMARY KEY ("Id")
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261109110358_AppForgeGeneratedInitial') THEN
    CREATE TABLE "PasswordResetTokens" (
        "Id" uuid NOT NULL,
        "AppUserId" uuid NOT NULL,
        "TokenHash" character varying(128) NOT NULL,
        "ExpiresAtUtc" timestamp with time zone NOT NULL,
        "UsedAtUtc" timestamp with time zone,
        "CreatedAtUtc" timestamp with time zone NOT NULL,
        CONSTRAINT "PK_PasswordResetTokens" PRIMARY KEY ("Id")
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261109110358_AppForgeGeneratedInitial') THEN
    CREATE TABLE "Permissions" (
        "Id" uuid NOT NULL,
        "Code" character varying(200) NOT NULL,
        "Name" character varying(200) NOT NULL,
        CONSTRAINT "PK_Permissions" PRIMARY KEY ("Id"),
        CONSTRAINT "CK_Permissions_Code_Standard" CHECK (LENGTH("Code") <= 200),
        CONSTRAINT "CK_Permissions_Name_Standard" CHECK (LENGTH("Name") <= 200)
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261109110358_AppForgeGeneratedInitial') THEN
    CREATE TABLE "PublicRegistrationAttempts" (
        "Id" uuid NOT NULL,
        "EmailHash" character varying(128) NOT NULL,
        "IpHash" character varying(128) NOT NULL,
        "Succeeded" boolean NOT NULL,
        "CreatedAtUtc" timestamp with time zone NOT NULL,
        CONSTRAINT "PK_PublicRegistrationAttempts" PRIMARY KEY ("Id")
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261109110358_AppForgeGeneratedInitial') THEN
    CREATE TABLE "Roles" (
        "Id" uuid NOT NULL,
        "Code" character varying(128) NOT NULL,
        "Name" character varying(200) NOT NULL,
        CONSTRAINT "PK_Roles" PRIMARY KEY ("Id"),
        CONSTRAINT "CK_Roles_Code_Standard" CHECK (LENGTH("Code") <= 128),
        CONSTRAINT "CK_Roles_Name_Standard" CHECK (LENGTH("Name") <= 200)
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261109110358_AppForgeGeneratedInitial') THEN
    CREATE TABLE "UserInvitations" (
        "Id" uuid NOT NULL,
        "Email" character varying(320) NOT NULL,
        "TokenHash" character varying(128) NOT NULL,
        "RoleCodes" character varying(1000) NOT NULL,
        "ExpiresAtUtc" timestamp with time zone NOT NULL,
        "AcceptedAtUtc" timestamp with time zone,
        "CreatedAtUtc" timestamp with time zone NOT NULL,
        CONSTRAINT "PK_UserInvitations" PRIMARY KEY ("Id")
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261109110358_AppForgeGeneratedInitial') THEN
    CREATE TABLE "ServiceRequests" (
        "Id" uuid NOT NULL,
        "CustomerId" uuid NOT NULL,
        "Title" character varying(200) NOT NULL,
        "Priority" character varying(24),
        "Description" character varying(1000),
        "CreationTime" timestamp with time zone NOT NULL,
        "CreatorId" uuid,
        "CreatorPositionId" uuid,
        "LastModificationTime" timestamp with time zone,
        "LastModifierId" uuid,
        "LastModifierPositionId" uuid,
        "IsDeleted" boolean NOT NULL DEFAULT FALSE,
        "DeletionTime" timestamp with time zone,
        "DeleterId" uuid,
        "DeleterPositionId" uuid,
        "TitleSearch" character varying(200) NOT NULL,
        "PrioritySearch" character varying(24) NOT NULL,
        "DescriptionSearch" character varying(1000) NOT NULL,
        CONSTRAINT "PK_ServiceRequests" PRIMARY KEY ("Id"),
        CONSTRAINT "CK_ServiceRequests_Description_Standard" CHECK ("Description" IS NULL OR (LENGTH("Description") <= 1000)),
        CONSTRAINT "CK_ServiceRequests_Priority_Standard" CHECK ("Priority" IS NULL OR (LENGTH("Priority") <= 24)),
        CONSTRAINT "CK_ServiceRequests_Title_Standard" CHECK (LENGTH("Title") <= 200),
        CONSTRAINT "FK_ServiceRequests_Customers_CustomerId" FOREIGN KEY ("CustomerId") REFERENCES "Customers" ("Id") ON DELETE CASCADE
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261109110358_AppForgeGeneratedInitial') THEN
    CREATE TABLE "RolePermissions" (
        "Id" uuid NOT NULL,
        "RoleId" uuid NOT NULL,
        "PermissionId" uuid NOT NULL,
        CONSTRAINT "PK_RolePermissions" PRIMARY KEY ("Id"),
        CONSTRAINT "FK_RolePermissions_Permissions_PermissionId" FOREIGN KEY ("PermissionId") REFERENCES "Permissions" ("Id") ON DELETE CASCADE,
        CONSTRAINT "FK_RolePermissions_Roles_RoleId" FOREIGN KEY ("RoleId") REFERENCES "Roles" ("Id") ON DELETE CASCADE
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261109110358_AppForgeGeneratedInitial') THEN
    CREATE TABLE "WorkItems" (
        "Id" uuid NOT NULL,
        "ServiceRequestId" uuid NOT NULL,
        "Title" character varying(200) NOT NULL,
        "Assignee" character varying(120),
        "Status" character varying(36),
        "Note" character varying(700),
        "CreationTime" timestamp with time zone NOT NULL,
        "CreatorId" uuid,
        "CreatorPositionId" uuid,
        "LastModificationTime" timestamp with time zone,
        "LastModifierId" uuid,
        "LastModifierPositionId" uuid,
        "IsDeleted" boolean NOT NULL DEFAULT FALSE,
        "DeletionTime" timestamp with time zone,
        "DeleterId" uuid,
        "DeleterPositionId" uuid,
        "TitleSearch" character varying(200) NOT NULL,
        "AssigneeSearch" character varying(120) NOT NULL,
        "StatusSearch" character varying(36) NOT NULL,
        "NoteSearch" character varying(700) NOT NULL,
        CONSTRAINT "PK_WorkItems" PRIMARY KEY ("Id"),
        CONSTRAINT "CK_WorkItems_Assignee_Standard" CHECK ("Assignee" IS NULL OR (LENGTH("Assignee") <= 120)),
        CONSTRAINT "CK_WorkItems_Note_Standard" CHECK ("Note" IS NULL OR (LENGTH("Note") <= 700)),
        CONSTRAINT "CK_WorkItems_Status_Standard" CHECK ("Status" IS NULL OR (LENGTH("Status") <= 36)),
        CONSTRAINT "CK_WorkItems_Title_Standard" CHECK (LENGTH("Title") <= 200),
        CONSTRAINT "FK_WorkItems_ServiceRequests_ServiceRequestId" FOREIGN KEY ("ServiceRequestId") REFERENCES "ServiceRequests" ("Id") ON DELETE CASCADE
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261109110358_AppForgeGeneratedInitial') THEN
    CREATE INDEX "IX___AppForgeRestMutationReceipts_CreatedAtUtc" ON "__AppForgeRestMutationReceipts" ("CreatedAtUtc");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261109110358_AppForgeGeneratedInitial') THEN
    CREATE UNIQUE INDEX "IX___AppForgeRestMutationReceipts_Subject_Endpoint_Idempotency" ON "__AppForgeRestMutationReceipts" ("SubjectKey", "EndpointKey", "IdempotencyKey");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261109110358_AppForgeGeneratedInitial') THEN
    CREATE INDEX "IX_AccountRecoveryAttempts_CreatedAtUtc" ON "AccountRecoveryAttempts" ("CreatedAtUtc");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261109110358_AppForgeGeneratedInitial') THEN
    CREATE INDEX "IX_AccountRecoveryAttempts_EmailHash" ON "AccountRecoveryAttempts" ("EmailHash");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261109110358_AppForgeGeneratedInitial') THEN
    CREATE INDEX "IX_AccountRecoveryAttempts_IpHash" ON "AccountRecoveryAttempts" ("IpHash");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261109110358_AppForgeGeneratedInitial') THEN
    CREATE UNIQUE INDEX "IX_AppUserRoles_AppUserId_RoleId" ON "AppUserRoles" ("AppUserId", "RoleId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261109110358_AppForgeGeneratedInitial') THEN
    CREATE UNIQUE INDEX "IX_AppUsers_Email" ON "AppUsers" ("Email");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261109110358_AppForgeGeneratedInitial') THEN
    CREATE UNIQUE INDEX "IX_AppUsers_UserName" ON "AppUsers" ("UserName");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261109110358_AppForgeGeneratedInitial') THEN
    CREATE UNIQUE INDEX "IX_AppUserSessions_AccessTokenHash" ON "AppUserSessions" ("AccessTokenHash");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261109110358_AppForgeGeneratedInitial') THEN
    CREATE INDEX "IX_AppUserSessions_AppUserId" ON "AppUserSessions" ("AppUserId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261109110358_AppForgeGeneratedInitial') THEN
    CREATE UNIQUE INDEX "IX_AppUserSessions_RefreshTokenHash" ON "AppUserSessions" ("RefreshTokenHash");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261109110358_AppForgeGeneratedInitial') THEN
    CREATE INDEX "IX_AuthLoginAttempts_CreatedAtUtc" ON "AuthLoginAttempts" ("CreatedAtUtc");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261109110358_AppForgeGeneratedInitial') THEN
    CREATE INDEX "IX_AuthLoginAttempts_IpHash" ON "AuthLoginAttempts" ("IpHash");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261109110358_AppForgeGeneratedInitial') THEN
    CREATE INDEX "IX_AuthLoginAttempts_LoginHash" ON "AuthLoginAttempts" ("LoginHash");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261109110358_AppForgeGeneratedInitial') THEN
    CREATE INDEX "IX_Customers_Email" ON "Customers" ("Email");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261109110358_AppForgeGeneratedInitial') THEN
    CREATE INDEX "IX_Customers_EmailSearch" ON "Customers" ("EmailSearch");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261109110358_AppForgeGeneratedInitial') THEN
    CREATE INDEX "IX_Customers_IsDeleted" ON "Customers" ("IsDeleted");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261109110358_AppForgeGeneratedInitial') THEN
    CREATE INDEX "IX_Customers_Name" ON "Customers" ("Name");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261109110358_AppForgeGeneratedInitial') THEN
    CREATE INDEX "IX_Customers_NameSearch" ON "Customers" ("NameSearch");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261109110358_AppForgeGeneratedInitial') THEN
    CREATE INDEX "IX_Customers_NoteSearch" ON "Customers" ("NoteSearch");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261109110358_AppForgeGeneratedInitial') THEN
    CREATE INDEX "IX_Customers_SegmentSearch" ON "Customers" ("SegmentSearch");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261109110358_AppForgeGeneratedInitial') THEN
    CREATE INDEX "IX_EmailConfirmationTokens_AppUserId" ON "EmailConfirmationTokens" ("AppUserId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261109110358_AppForgeGeneratedInitial') THEN
    CREATE UNIQUE INDEX "IX_EmailConfirmationTokens_TokenHash" ON "EmailConfirmationTokens" ("TokenHash");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261109110358_AppForgeGeneratedInitial') THEN
    CREATE INDEX "IX_IdentityAuditLogs_Action" ON "IdentityAuditLogs" ("Action");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261109110358_AppForgeGeneratedInitial') THEN
    CREATE INDEX "IX_IdentityAuditLogs_ActorUserId" ON "IdentityAuditLogs" ("ActorUserId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261109110358_AppForgeGeneratedInitial') THEN
    CREATE INDEX "IX_IdentityAuditLogs_CreatedAtUtc" ON "IdentityAuditLogs" ("CreatedAtUtc");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261109110358_AppForgeGeneratedInitial') THEN
    CREATE INDEX "IX_IdentityAuditLogs_TargetUserId" ON "IdentityAuditLogs" ("TargetUserId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261109110358_AppForgeGeneratedInitial') THEN
    CREATE INDEX "IX_PasswordResetTokens_AppUserId" ON "PasswordResetTokens" ("AppUserId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261109110358_AppForgeGeneratedInitial') THEN
    CREATE UNIQUE INDEX "IX_PasswordResetTokens_TokenHash" ON "PasswordResetTokens" ("TokenHash");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261109110358_AppForgeGeneratedInitial') THEN
    CREATE UNIQUE INDEX "IX_Permissions_Code" ON "Permissions" ("Code");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261109110358_AppForgeGeneratedInitial') THEN
    CREATE INDEX "IX_PublicRegistrationAttempts_CreatedAtUtc" ON "PublicRegistrationAttempts" ("CreatedAtUtc");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261109110358_AppForgeGeneratedInitial') THEN
    CREATE INDEX "IX_PublicRegistrationAttempts_EmailHash" ON "PublicRegistrationAttempts" ("EmailHash");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261109110358_AppForgeGeneratedInitial') THEN
    CREATE INDEX "IX_PublicRegistrationAttempts_IpHash" ON "PublicRegistrationAttempts" ("IpHash");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261109110358_AppForgeGeneratedInitial') THEN
    CREATE INDEX "IX_RolePermissions_PermissionId" ON "RolePermissions" ("PermissionId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261109110358_AppForgeGeneratedInitial') THEN
    CREATE UNIQUE INDEX "IX_RolePermissions_RoleId_PermissionId" ON "RolePermissions" ("RoleId", "PermissionId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261109110358_AppForgeGeneratedInitial') THEN
    CREATE UNIQUE INDEX "IX_Roles_Code" ON "Roles" ("Code");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261109110358_AppForgeGeneratedInitial') THEN
    CREATE INDEX "IX_ServiceRequests_CustomerId" ON "ServiceRequests" ("CustomerId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261109110358_AppForgeGeneratedInitial') THEN
    CREATE INDEX "IX_ServiceRequests_DescriptionSearch" ON "ServiceRequests" ("DescriptionSearch");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261109110358_AppForgeGeneratedInitial') THEN
    CREATE INDEX "IX_ServiceRequests_IsDeleted" ON "ServiceRequests" ("IsDeleted");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261109110358_AppForgeGeneratedInitial') THEN
    CREATE INDEX "IX_ServiceRequests_PrioritySearch" ON "ServiceRequests" ("PrioritySearch");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261109110358_AppForgeGeneratedInitial') THEN
    CREATE INDEX "IX_ServiceRequests_TitleSearch" ON "ServiceRequests" ("TitleSearch");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261109110358_AppForgeGeneratedInitial') THEN
    CREATE INDEX "IX_UserInvitations_Email" ON "UserInvitations" ("Email");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261109110358_AppForgeGeneratedInitial') THEN
    CREATE UNIQUE INDEX "IX_UserInvitations_TokenHash" ON "UserInvitations" ("TokenHash");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261109110358_AppForgeGeneratedInitial') THEN
    CREATE INDEX "IX_WorkItems_AssigneeSearch" ON "WorkItems" ("AssigneeSearch");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261109110358_AppForgeGeneratedInitial') THEN
    CREATE INDEX "IX_WorkItems_IsDeleted" ON "WorkItems" ("IsDeleted");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261109110358_AppForgeGeneratedInitial') THEN
    CREATE INDEX "IX_WorkItems_NoteSearch" ON "WorkItems" ("NoteSearch");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261109110358_AppForgeGeneratedInitial') THEN
    CREATE INDEX "IX_WorkItems_ServiceRequestId" ON "WorkItems" ("ServiceRequestId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261109110358_AppForgeGeneratedInitial') THEN
    CREATE INDEX "IX_WorkItems_StatusSearch" ON "WorkItems" ("StatusSearch");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261109110358_AppForgeGeneratedInitial') THEN
    CREATE INDEX "IX_WorkItems_TitleSearch" ON "WorkItems" ("TitleSearch");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261109110358_AppForgeGeneratedInitial') THEN
    INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
    VALUES ('20261109110358_AppForgeGeneratedInitial', '10.0.0');
    END IF;
END $EF$;
COMMIT;
