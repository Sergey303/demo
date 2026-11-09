CREATE TABLE IF NOT EXISTS "__EFMigrationsHistory" (
    "MigrationId" character varying(150) NOT NULL,
    "ProductVersion" character varying(32) NOT NULL,
    CONSTRAINT "PK___EFMigrationsHistory" PRIMARY KEY ("MigrationId")
);

START TRANSACTION;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261109091850_AppForgeGeneratedInitial') THEN
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
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261109091850_AppForgeGeneratedInitial') THEN
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
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261109091850_AppForgeGeneratedInitial') THEN
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
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261109091850_AppForgeGeneratedInitial') THEN
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
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261109091850_AppForgeGeneratedInitial') THEN
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
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261109091850_AppForgeGeneratedInitial') THEN
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
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261109091850_AppForgeGeneratedInitial') THEN
    CREATE TABLE "CampaignStatuses" (
        "Id" uuid NOT NULL,
        "Code" character varying(64) NOT NULL,
        "Name" character varying(200) NOT NULL,
        "SortOrder" integer NOT NULL,
        CONSTRAINT "PK_CampaignStatuses" PRIMARY KEY ("Id"),
        CONSTRAINT "CK_CampaignStatuses_Code_Standard" CHECK (LENGTH("Code") <= 64),
        CONSTRAINT "CK_CampaignStatuses_Name_Standard" CHECK (LENGTH("Name") <= 200)
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261109091850_AppForgeGeneratedInitial') THEN
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
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261109091850_AppForgeGeneratedInitial') THEN
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
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261109091850_AppForgeGeneratedInitial') THEN
    CREATE TABLE "LeadStatuses" (
        "Id" uuid NOT NULL,
        "Code" character varying(64) NOT NULL,
        "Name" character varying(200) NOT NULL,
        "SortOrder" integer NOT NULL,
        CONSTRAINT "PK_LeadStatuses" PRIMARY KEY ("Id"),
        CONSTRAINT "CK_LeadStatuses_Code_Standard" CHECK (LENGTH("Code") <= 64),
        CONSTRAINT "CK_LeadStatuses_Name_Standard" CHECK (LENGTH("Name") <= 200)
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261109091850_AppForgeGeneratedInitial') THEN
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
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261109091850_AppForgeGeneratedInitial') THEN
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
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261109091850_AppForgeGeneratedInitial') THEN
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
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261109091850_AppForgeGeneratedInitial') THEN
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
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261109091850_AppForgeGeneratedInitial') THEN
    CREATE TABLE "SubscriberStatuses" (
        "Id" uuid NOT NULL,
        "Code" character varying(64) NOT NULL,
        "Name" character varying(200) NOT NULL,
        "SortOrder" integer NOT NULL,
        CONSTRAINT "PK_SubscriberStatuses" PRIMARY KEY ("Id"),
        CONSTRAINT "CK_SubscriberStatuses_Code_Standard" CHECK (LENGTH("Code") <= 64),
        CONSTRAINT "CK_SubscriberStatuses_Name_Standard" CHECK (LENGTH("Name") <= 200)
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261109091850_AppForgeGeneratedInitial') THEN
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
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261109091850_AppForgeGeneratedInitial') THEN
    CREATE TABLE "Campaigns" (
        "Id" uuid NOT NULL,
        "Name" character varying(160) NOT NULL,
        "AudienceDescription" character varying(300) NOT NULL,
        "MessageTemplate" character varying(2000) NOT NULL,
        "StatusId" uuid NOT NULL,
        "CreatedAt" timestamp with time zone NOT NULL,
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
        "NameSearch" character varying(160) NOT NULL,
        "AudienceDescriptionSearch" character varying(300) NOT NULL,
        "MessageTemplateSearch" character varying(2000) NOT NULL,
        "NoteSearch" character varying(500) NOT NULL,
        CONSTRAINT "PK_Campaigns" PRIMARY KEY ("Id"),
        CONSTRAINT "CK_Campaigns_AudienceDescription_Standard" CHECK (LENGTH("AudienceDescription") <= 300),
        CONSTRAINT "CK_Campaigns_MessageTemplate_Standard" CHECK (LENGTH("MessageTemplate") <= 2000),
        CONSTRAINT "CK_Campaigns_Name_Standard" CHECK (LENGTH("Name") <= 160),
        CONSTRAINT "CK_Campaigns_Note_Standard" CHECK ("Note" IS NULL OR (LENGTH("Note") <= 500)),
        CONSTRAINT "FK_Campaigns_CampaignStatuses_StatusId" FOREIGN KEY ("StatusId") REFERENCES "CampaignStatuses" ("Id") ON DELETE CASCADE
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261109091850_AppForgeGeneratedInitial') THEN
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
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261109091850_AppForgeGeneratedInitial') THEN
    CREATE TABLE "Subscribers" (
        "Id" uuid NOT NULL,
        "Handle" character varying(80) NOT NULL,
        "DisplayName" character varying(200) NOT NULL,
        "StatusId" uuid NOT NULL,
        "JoinedAt" timestamp with time zone NOT NULL,
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
        "HandleSearch" character varying(80) NOT NULL,
        "DisplayNameSearch" character varying(200) NOT NULL,
        "NoteSearch" character varying(500) NOT NULL,
        CONSTRAINT "PK_Subscribers" PRIMARY KEY ("Id"),
        CONSTRAINT "CK_Subscribers_DisplayName_Standard" CHECK (LENGTH("DisplayName") <= 200),
        CONSTRAINT "CK_Subscribers_Handle_Standard" CHECK (LENGTH("Handle") <= 80),
        CONSTRAINT "CK_Subscribers_Note_Standard" CHECK ("Note" IS NULL OR (LENGTH("Note") <= 500)),
        CONSTRAINT "FK_Subscribers_SubscriberStatuses_StatusId" FOREIGN KEY ("StatusId") REFERENCES "SubscriberStatuses" ("Id") ON DELETE CASCADE
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261109091850_AppForgeGeneratedInitial') THEN
    CREATE TABLE "Leads" (
        "Id" uuid NOT NULL,
        "SubscriberId" uuid NOT NULL,
        "Subject" character varying(200) NOT NULL,
        "StatusId" uuid NOT NULL,
        "Owner" character varying(120),
        "CreatedAt" timestamp with time zone NOT NULL,
        "Note" character varying(1000),
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
        "SubjectSearch" character varying(200) NOT NULL,
        "OwnerSearch" character varying(120) NOT NULL,
        "NoteSearch" character varying(1000) NOT NULL,
        CONSTRAINT "PK_Leads" PRIMARY KEY ("Id"),
        CONSTRAINT "CK_Leads_Note_Standard" CHECK ("Note" IS NULL OR (LENGTH("Note") <= 1000)),
        CONSTRAINT "CK_Leads_Owner_Standard" CHECK ("Owner" IS NULL OR (LENGTH("Owner") <= 120)),
        CONSTRAINT "CK_Leads_Subject_Standard" CHECK (LENGTH("Subject") <= 200),
        CONSTRAINT "FK_Leads_LeadStatuses_StatusId" FOREIGN KEY ("StatusId") REFERENCES "LeadStatuses" ("Id") ON DELETE CASCADE,
        CONSTRAINT "FK_Leads_Subscribers_SubscriberId" FOREIGN KEY ("SubscriberId") REFERENCES "Subscribers" ("Id") ON DELETE CASCADE
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261109091850_AppForgeGeneratedInitial') THEN
    CREATE INDEX "IX___AppForgeRestMutationReceipts_CreatedAtUtc" ON "__AppForgeRestMutationReceipts" ("CreatedAtUtc");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261109091850_AppForgeGeneratedInitial') THEN
    CREATE UNIQUE INDEX "IX___AppForgeRestMutationReceipts_Subject_Endpoint_Idempotency" ON "__AppForgeRestMutationReceipts" ("SubjectKey", "EndpointKey", "IdempotencyKey");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261109091850_AppForgeGeneratedInitial') THEN
    CREATE INDEX "IX_AccountRecoveryAttempts_CreatedAtUtc" ON "AccountRecoveryAttempts" ("CreatedAtUtc");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261109091850_AppForgeGeneratedInitial') THEN
    CREATE INDEX "IX_AccountRecoveryAttempts_EmailHash" ON "AccountRecoveryAttempts" ("EmailHash");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261109091850_AppForgeGeneratedInitial') THEN
    CREATE INDEX "IX_AccountRecoveryAttempts_IpHash" ON "AccountRecoveryAttempts" ("IpHash");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261109091850_AppForgeGeneratedInitial') THEN
    CREATE UNIQUE INDEX "IX_AppUserRoles_AppUserId_RoleId" ON "AppUserRoles" ("AppUserId", "RoleId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261109091850_AppForgeGeneratedInitial') THEN
    CREATE UNIQUE INDEX "IX_AppUsers_Email" ON "AppUsers" ("Email");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261109091850_AppForgeGeneratedInitial') THEN
    CREATE UNIQUE INDEX "IX_AppUsers_UserName" ON "AppUsers" ("UserName");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261109091850_AppForgeGeneratedInitial') THEN
    CREATE UNIQUE INDEX "IX_AppUserSessions_AccessTokenHash" ON "AppUserSessions" ("AccessTokenHash");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261109091850_AppForgeGeneratedInitial') THEN
    CREATE INDEX "IX_AppUserSessions_AppUserId" ON "AppUserSessions" ("AppUserId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261109091850_AppForgeGeneratedInitial') THEN
    CREATE UNIQUE INDEX "IX_AppUserSessions_RefreshTokenHash" ON "AppUserSessions" ("RefreshTokenHash");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261109091850_AppForgeGeneratedInitial') THEN
    CREATE INDEX "IX_AuthLoginAttempts_CreatedAtUtc" ON "AuthLoginAttempts" ("CreatedAtUtc");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261109091850_AppForgeGeneratedInitial') THEN
    CREATE INDEX "IX_AuthLoginAttempts_IpHash" ON "AuthLoginAttempts" ("IpHash");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261109091850_AppForgeGeneratedInitial') THEN
    CREATE INDEX "IX_AuthLoginAttempts_LoginHash" ON "AuthLoginAttempts" ("LoginHash");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261109091850_AppForgeGeneratedInitial') THEN
    CREATE INDEX "IX_Campaigns_AudienceDescriptionSearch" ON "Campaigns" ("AudienceDescriptionSearch");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261109091850_AppForgeGeneratedInitial') THEN
    CREATE INDEX "IX_Campaigns_IsDeleted" ON "Campaigns" ("IsDeleted");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261109091850_AppForgeGeneratedInitial') THEN
    CREATE INDEX "IX_Campaigns_MessageTemplateSearch" ON "Campaigns" ("MessageTemplateSearch");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261109091850_AppForgeGeneratedInitial') THEN
    CREATE INDEX "IX_Campaigns_Name" ON "Campaigns" ("Name");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261109091850_AppForgeGeneratedInitial') THEN
    CREATE INDEX "IX_Campaigns_NameSearch" ON "Campaigns" ("NameSearch");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261109091850_AppForgeGeneratedInitial') THEN
    CREATE INDEX "IX_Campaigns_NoteSearch" ON "Campaigns" ("NoteSearch");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261109091850_AppForgeGeneratedInitial') THEN
    CREATE INDEX "IX_Campaigns_Status" ON "Campaigns" ("StatusId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261109091850_AppForgeGeneratedInitial') THEN
    CREATE UNIQUE INDEX "IX_CampaignStatuses_Code" ON "CampaignStatuses" ("Code");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261109091850_AppForgeGeneratedInitial') THEN
    CREATE INDEX "IX_EmailConfirmationTokens_AppUserId" ON "EmailConfirmationTokens" ("AppUserId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261109091850_AppForgeGeneratedInitial') THEN
    CREATE UNIQUE INDEX "IX_EmailConfirmationTokens_TokenHash" ON "EmailConfirmationTokens" ("TokenHash");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261109091850_AppForgeGeneratedInitial') THEN
    CREATE INDEX "IX_IdentityAuditLogs_Action" ON "IdentityAuditLogs" ("Action");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261109091850_AppForgeGeneratedInitial') THEN
    CREATE INDEX "IX_IdentityAuditLogs_ActorUserId" ON "IdentityAuditLogs" ("ActorUserId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261109091850_AppForgeGeneratedInitial') THEN
    CREATE INDEX "IX_IdentityAuditLogs_CreatedAtUtc" ON "IdentityAuditLogs" ("CreatedAtUtc");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261109091850_AppForgeGeneratedInitial') THEN
    CREATE INDEX "IX_IdentityAuditLogs_TargetUserId" ON "IdentityAuditLogs" ("TargetUserId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261109091850_AppForgeGeneratedInitial') THEN
    CREATE INDEX "IX_Leads_IsDeleted" ON "Leads" ("IsDeleted");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261109091850_AppForgeGeneratedInitial') THEN
    CREATE INDEX "IX_Leads_NoteSearch" ON "Leads" ("NoteSearch");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261109091850_AppForgeGeneratedInitial') THEN
    CREATE INDEX "IX_Leads_OwnerSearch" ON "Leads" ("OwnerSearch");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261109091850_AppForgeGeneratedInitial') THEN
    CREATE INDEX "IX_Leads_Status" ON "Leads" ("StatusId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261109091850_AppForgeGeneratedInitial') THEN
    CREATE INDEX "IX_Leads_SubjectSearch" ON "Leads" ("SubjectSearch");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261109091850_AppForgeGeneratedInitial') THEN
    CREATE INDEX "IX_Leads_SubscriberId" ON "Leads" ("SubscriberId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261109091850_AppForgeGeneratedInitial') THEN
    CREATE UNIQUE INDEX "IX_LeadStatuses_Code" ON "LeadStatuses" ("Code");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261109091850_AppForgeGeneratedInitial') THEN
    CREATE INDEX "IX_PasswordResetTokens_AppUserId" ON "PasswordResetTokens" ("AppUserId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261109091850_AppForgeGeneratedInitial') THEN
    CREATE UNIQUE INDEX "IX_PasswordResetTokens_TokenHash" ON "PasswordResetTokens" ("TokenHash");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261109091850_AppForgeGeneratedInitial') THEN
    CREATE UNIQUE INDEX "IX_Permissions_Code" ON "Permissions" ("Code");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261109091850_AppForgeGeneratedInitial') THEN
    CREATE INDEX "IX_PublicRegistrationAttempts_CreatedAtUtc" ON "PublicRegistrationAttempts" ("CreatedAtUtc");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261109091850_AppForgeGeneratedInitial') THEN
    CREATE INDEX "IX_PublicRegistrationAttempts_EmailHash" ON "PublicRegistrationAttempts" ("EmailHash");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261109091850_AppForgeGeneratedInitial') THEN
    CREATE INDEX "IX_PublicRegistrationAttempts_IpHash" ON "PublicRegistrationAttempts" ("IpHash");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261109091850_AppForgeGeneratedInitial') THEN
    CREATE INDEX "IX_RolePermissions_PermissionId" ON "RolePermissions" ("PermissionId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261109091850_AppForgeGeneratedInitial') THEN
    CREATE UNIQUE INDEX "IX_RolePermissions_RoleId_PermissionId" ON "RolePermissions" ("RoleId", "PermissionId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261109091850_AppForgeGeneratedInitial') THEN
    CREATE UNIQUE INDEX "IX_Roles_Code" ON "Roles" ("Code");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261109091850_AppForgeGeneratedInitial') THEN
    CREATE INDEX "IX_Subscribers_DisplayNameSearch" ON "Subscribers" ("DisplayNameSearch");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261109091850_AppForgeGeneratedInitial') THEN
    CREATE UNIQUE INDEX "IX_Subscribers_Handle" ON "Subscribers" ("Handle");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261109091850_AppForgeGeneratedInitial') THEN
    CREATE INDEX "IX_Subscribers_HandleSearch" ON "Subscribers" ("HandleSearch");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261109091850_AppForgeGeneratedInitial') THEN
    CREATE INDEX "IX_Subscribers_IsDeleted" ON "Subscribers" ("IsDeleted");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261109091850_AppForgeGeneratedInitial') THEN
    CREATE INDEX "IX_Subscribers_NoteSearch" ON "Subscribers" ("NoteSearch");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261109091850_AppForgeGeneratedInitial') THEN
    CREATE INDEX "IX_Subscribers_Status" ON "Subscribers" ("StatusId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261109091850_AppForgeGeneratedInitial') THEN
    CREATE UNIQUE INDEX "IX_SubscriberStatuses_Code" ON "SubscriberStatuses" ("Code");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261109091850_AppForgeGeneratedInitial') THEN
    CREATE INDEX "IX_UserInvitations_Email" ON "UserInvitations" ("Email");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261109091850_AppForgeGeneratedInitial') THEN
    CREATE UNIQUE INDEX "IX_UserInvitations_TokenHash" ON "UserInvitations" ("TokenHash");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261109091850_AppForgeGeneratedInitial') THEN
    INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
    VALUES ('20261109091850_AppForgeGeneratedInitial', '10.0.0');
    END IF;
END $EF$;
COMMIT;
