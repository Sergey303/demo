#nullable enable

using Demo.TelegramOperations;
using Microsoft.EntityFrameworkCore;

namespace Demo.TelegramOperations.Persistence;

internal static class PreviewSeedData
{
    public static async Task SeedAsync(
        TelegramOperationsAdminDbContext db,
        CancellationToken cancellationToken = default)
    {
        var subscriberStatusActive = new SubscriberStatus
        {
            Id = Guid.Parse("2cfaef9b-bad3-5ecd-a968-43b76a923278"),
            Code = "active",
            Name = "Active",
            SortOrder = 10,
        };

        var subscriberStatusPaused = new SubscriberStatus
        {
            Id = Guid.Parse("3855f1fa-c1ae-5b51-ba6e-4e8799850de8"),
            Code = "paused",
            Name = "Paused",
            SortOrder = 20,
        };

        var subscriberStatusBlocked = new SubscriberStatus
        {
            Id = Guid.Parse("f912619c-a7ee-5b6b-b1fc-8b820d37d551"),
            Code = "blocked",
            Name = "Blocked",
            SortOrder = 30,
        };

        var leadStatusNew = new LeadStatus
        {
            Id = Guid.Parse("f38ab1fd-b399-53cc-9938-533db8d572d6"),
            Code = "new",
            Name = "New",
            SortOrder = 10,
        };

        var leadStatusContacted = new LeadStatus
        {
            Id = Guid.Parse("6664dc48-0bfa-53d6-91a8-b36f1467161a"),
            Code = "contacted",
            Name = "Contacted",
            SortOrder = 20,
        };

        var leadStatusQualified = new LeadStatus
        {
            Id = Guid.Parse("9b8032c0-effc-50ce-963f-240b6d6dd8d6"),
            Code = "qualified",
            Name = "Qualified",
            SortOrder = 30,
        };

        var leadStatusClosed = new LeadStatus
        {
            Id = Guid.Parse("b9448d5b-15a3-5473-9d3a-229a20c07735"),
            Code = "closed",
            Name = "Closed",
            SortOrder = 40,
        };

        var campaignStatusDraft = new CampaignStatus
        {
            Id = Guid.Parse("35938e2b-2eb3-5f35-937f-0d19787545f7"),
            Code = "draft",
            Name = "Draft",
            SortOrder = 10,
        };

        var campaignStatusApproved = new CampaignStatus
        {
            Id = Guid.Parse("1422a695-c5bc-54ae-bcbf-48eca520445c"),
            Code = "approved",
            Name = "Approved",
            SortOrder = 20,
        };

        var campaignStatusArchived = new CampaignStatus
        {
            Id = Guid.Parse("e6ff932f-c72e-50ab-9c52-4afa4f51786a"),
            Code = "archived",
            Name = "Archived",
            SortOrder = 30,
        };

        var roleAdmin = new Role
        {
            Id = Guid.Parse("51d1a9a0-0203-5c3e-83ed-0aae24a61d6d"),
            Code = "Admin",
            Name = "Admin",
        };

        var permissionSubscriberRead = new Permission
        {
            Id = Guid.Parse("07efdae8-4fdb-53b0-bd2b-c866f77725ab"),
            Code = "Subscriber.Read",
            Name = "Subscriber Read",
        };

        var permissionSubscriberCreate = new Permission
        {
            Id = Guid.Parse("55932e6f-378a-5328-88b7-52fe7a41d8cb"),
            Code = "Subscriber.Create",
            Name = "Subscriber Create",
        };

        var permissionSubscriberUpdate = new Permission
        {
            Id = Guid.Parse("6f793167-1008-572d-80f7-b0471f9abb26"),
            Code = "Subscriber.Update",
            Name = "Subscriber Update",
        };

        var permissionSubscriberDelete = new Permission
        {
            Id = Guid.Parse("37c97ab9-6be5-5aaa-8fa3-137e9689950d"),
            Code = "Subscriber.Delete",
            Name = "Subscriber Delete",
        };

        var permissionLeadRead = new Permission
        {
            Id = Guid.Parse("f2a1220a-4561-5f98-a230-c2abe06c92d6"),
            Code = "Lead.Read",
            Name = "Lead Read",
        };

        var permissionLeadCreate = new Permission
        {
            Id = Guid.Parse("8309e259-5c2d-5428-ade5-a30d7935427f"),
            Code = "Lead.Create",
            Name = "Lead Create",
        };

        var permissionLeadUpdate = new Permission
        {
            Id = Guid.Parse("29515eff-b007-5d25-911b-79756edf0edc"),
            Code = "Lead.Update",
            Name = "Lead Update",
        };

        var permissionLeadDelete = new Permission
        {
            Id = Guid.Parse("ec43e959-c532-597b-9c1a-07b964406431"),
            Code = "Lead.Delete",
            Name = "Lead Delete",
        };

        var permissionCampaignRead = new Permission
        {
            Id = Guid.Parse("4f0984ae-3994-5823-a156-bf759d867472"),
            Code = "Campaign.Read",
            Name = "Campaign Read",
        };

        var permissionCampaignCreate = new Permission
        {
            Id = Guid.Parse("872962dd-6992-51fe-8595-957090faa0f1"),
            Code = "Campaign.Create",
            Name = "Campaign Create",
        };

        var permissionCampaignUpdate = new Permission
        {
            Id = Guid.Parse("a3b1c4e6-eac6-5c09-bcb5-a9e34ee386b5"),
            Code = "Campaign.Update",
            Name = "Campaign Update",
        };

        var permissionCampaignDelete = new Permission
        {
            Id = Guid.Parse("170f8ccd-768e-59b7-bd73-55b0a4f509cc"),
            Code = "Campaign.Delete",
            Name = "Campaign Delete",
        };

        var rolePermissionAdminSubscriberRead = new RolePermission
        {
            Id = Guid.Parse("565709c0-5b06-5434-a649-288ab35f91e7"),
            RoleId = Guid.Parse("51d1a9a0-0203-5c3e-83ed-0aae24a61d6d"),
            PermissionId = Guid.Parse("07efdae8-4fdb-53b0-bd2b-c866f77725ab"),
        };

        var rolePermissionAdminSubscriberCreate = new RolePermission
        {
            Id = Guid.Parse("a9501924-00f5-5cdc-bd90-a38b5867b40b"),
            RoleId = Guid.Parse("51d1a9a0-0203-5c3e-83ed-0aae24a61d6d"),
            PermissionId = Guid.Parse("55932e6f-378a-5328-88b7-52fe7a41d8cb"),
        };

        var rolePermissionAdminSubscriberUpdate = new RolePermission
        {
            Id = Guid.Parse("36533449-fbed-5485-a11b-2a38381fe796"),
            RoleId = Guid.Parse("51d1a9a0-0203-5c3e-83ed-0aae24a61d6d"),
            PermissionId = Guid.Parse("6f793167-1008-572d-80f7-b0471f9abb26"),
        };

        var rolePermissionAdminSubscriberDelete = new RolePermission
        {
            Id = Guid.Parse("d891dd86-aea7-57c9-84c2-c780dc0fb195"),
            RoleId = Guid.Parse("51d1a9a0-0203-5c3e-83ed-0aae24a61d6d"),
            PermissionId = Guid.Parse("37c97ab9-6be5-5aaa-8fa3-137e9689950d"),
        };

        var rolePermissionAdminLeadRead = new RolePermission
        {
            Id = Guid.Parse("ad6d02f5-9740-5907-b771-a49f4a74dc14"),
            RoleId = Guid.Parse("51d1a9a0-0203-5c3e-83ed-0aae24a61d6d"),
            PermissionId = Guid.Parse("f2a1220a-4561-5f98-a230-c2abe06c92d6"),
        };

        var rolePermissionAdminLeadCreate = new RolePermission
        {
            Id = Guid.Parse("6fa5b090-7de9-5f37-896f-ec18145a1aea"),
            RoleId = Guid.Parse("51d1a9a0-0203-5c3e-83ed-0aae24a61d6d"),
            PermissionId = Guid.Parse("8309e259-5c2d-5428-ade5-a30d7935427f"),
        };

        var rolePermissionAdminLeadUpdate = new RolePermission
        {
            Id = Guid.Parse("2024f63c-e770-5ed5-9dd5-5346983ca558"),
            RoleId = Guid.Parse("51d1a9a0-0203-5c3e-83ed-0aae24a61d6d"),
            PermissionId = Guid.Parse("29515eff-b007-5d25-911b-79756edf0edc"),
        };

        var rolePermissionAdminLeadDelete = new RolePermission
        {
            Id = Guid.Parse("50419364-db6f-5d8d-aa3f-6490aefca6dc"),
            RoleId = Guid.Parse("51d1a9a0-0203-5c3e-83ed-0aae24a61d6d"),
            PermissionId = Guid.Parse("ec43e959-c532-597b-9c1a-07b964406431"),
        };

        var rolePermissionAdminCampaignRead = new RolePermission
        {
            Id = Guid.Parse("9bfd90cc-9729-56bd-853e-c3a6d2bff9ce"),
            RoleId = Guid.Parse("51d1a9a0-0203-5c3e-83ed-0aae24a61d6d"),
            PermissionId = Guid.Parse("4f0984ae-3994-5823-a156-bf759d867472"),
        };

        var rolePermissionAdminCampaignCreate = new RolePermission
        {
            Id = Guid.Parse("84866cf2-7a03-5bd0-8b81-b5df358e6b26"),
            RoleId = Guid.Parse("51d1a9a0-0203-5c3e-83ed-0aae24a61d6d"),
            PermissionId = Guid.Parse("872962dd-6992-51fe-8595-957090faa0f1"),
        };

        var rolePermissionAdminCampaignUpdate = new RolePermission
        {
            Id = Guid.Parse("a985c03b-ff47-59be-ba72-ef1b6721f487"),
            RoleId = Guid.Parse("51d1a9a0-0203-5c3e-83ed-0aae24a61d6d"),
            PermissionId = Guid.Parse("a3b1c4e6-eac6-5c09-bcb5-a9e34ee386b5"),
        };

        var rolePermissionAdminCampaignDelete = new RolePermission
        {
            Id = Guid.Parse("0e112d43-4067-5942-a8d1-202661ef7690"),
            RoleId = Guid.Parse("51d1a9a0-0203-5c3e-83ed-0aae24a61d6d"),
            PermissionId = Guid.Parse("170f8ccd-768e-59b7-bd73-55b0a4f509cc"),
        };


        var subscriber = new Subscriber
        {
            Id = Guid.Parse("93a301e2-3f8e-564f-bd23-ebeabafcaa51"),
            Handle = "Subscriber Handle",
            DisplayName = "Subscriber DisplayName",
            StatusId = Guid.Parse("2cfaef9b-bad3-5ecd-a968-43b76a923278"),
            JoinedAt = default,
            Note = "Subscriber Note",
            CreationTime = new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc),
            CreatorId = null,
            LastModificationTime = null,
            LastModifierId = null,
            IsDeleted = false,
            DeletionTime = null,
            DeleterId = null,
            HandleSearch = NormalizeSearchValue("Subscriber Handle"),
            DisplayNameSearch = NormalizeSearchValue("Subscriber DisplayName"),
            NoteSearch = NormalizeSearchValue("Subscriber Note"),
        };

        var lead = new Lead
        {
            Id = Guid.Parse("e2c322c9-38ff-56c1-9ab6-16fee575d8bd"),
            SubscriberId = Guid.Parse("93a301e2-3f8e-564f-bd23-ebeabafcaa51"),
            Subject = "Lead Subject",
            StatusId = Guid.Parse("f38ab1fd-b399-53cc-9938-533db8d572d6"),
            Owner = "Lead Owner",
            CreatedAt = default,
            Note = "Lead Note",
            CreationTime = new DateTime(2026, 1, 2, 0, 0, 0, DateTimeKind.Utc),
            CreatorId = null,
            LastModificationTime = null,
            LastModifierId = null,
            IsDeleted = false,
            DeletionTime = null,
            DeleterId = null,
            SubjectSearch = NormalizeSearchValue("Lead Subject"),
            OwnerSearch = NormalizeSearchValue("Lead Owner"),
            NoteSearch = NormalizeSearchValue("Lead Note"),
        };

        var campaign = new Campaign
        {
            Id = Guid.Parse("a3996b47-18df-5919-96b0-b842193d8499"),
            Name = "Campaign Name",
            AudienceDescription = "Campaign AudienceDescription",
            MessageTemplate = "Campaign MessageTemplate",
            StatusId = Guid.Parse("35938e2b-2eb3-5f35-937f-0d19787545f7"),
            CreatedAt = default,
            Note = "Campaign Note",
            CreationTime = new DateTime(2026, 1, 3, 0, 0, 0, DateTimeKind.Utc),
            CreatorId = null,
            LastModificationTime = null,
            LastModifierId = null,
            IsDeleted = false,
            DeletionTime = null,
            DeleterId = null,
            NameSearch = NormalizeSearchValue("Campaign Name"),
            AudienceDescriptionSearch = NormalizeSearchValue("Campaign AudienceDescription"),
            MessageTemplateSearch = NormalizeSearchValue("Campaign MessageTemplate"),
            NoteSearch = NormalizeSearchValue("Campaign Note"),
        };

        if (!await db.SubscriberStatuses.AnyAsync(x => x.Code == "active", cancellationToken))
        {
            db.SubscriberStatuses.Add(subscriberStatusActive);
        }

        if (!await db.SubscriberStatuses.AnyAsync(x => x.Code == "paused", cancellationToken))
        {
            db.SubscriberStatuses.Add(subscriberStatusPaused);
        }

        if (!await db.SubscriberStatuses.AnyAsync(x => x.Code == "blocked", cancellationToken))
        {
            db.SubscriberStatuses.Add(subscriberStatusBlocked);
        }

        if (!await db.LeadStatuses.AnyAsync(x => x.Code == "new", cancellationToken))
        {
            db.LeadStatuses.Add(leadStatusNew);
        }

        if (!await db.LeadStatuses.AnyAsync(x => x.Code == "contacted", cancellationToken))
        {
            db.LeadStatuses.Add(leadStatusContacted);
        }

        if (!await db.LeadStatuses.AnyAsync(x => x.Code == "qualified", cancellationToken))
        {
            db.LeadStatuses.Add(leadStatusQualified);
        }

        if (!await db.LeadStatuses.AnyAsync(x => x.Code == "closed", cancellationToken))
        {
            db.LeadStatuses.Add(leadStatusClosed);
        }

        if (!await db.CampaignStatuses.AnyAsync(x => x.Code == "draft", cancellationToken))
        {
            db.CampaignStatuses.Add(campaignStatusDraft);
        }

        if (!await db.CampaignStatuses.AnyAsync(x => x.Code == "approved", cancellationToken))
        {
            db.CampaignStatuses.Add(campaignStatusApproved);
        }

        if (!await db.CampaignStatuses.AnyAsync(x => x.Code == "archived", cancellationToken))
        {
            db.CampaignStatuses.Add(campaignStatusArchived);
        }

        if (!await db.Roles.AnyAsync(x => x.Code == "Admin", cancellationToken))
        {
            db.Roles.Add(roleAdmin);
        }

        if (!await db.Permissions.AnyAsync(x => x.Code == "Subscriber.Read", cancellationToken))
        {
            db.Permissions.Add(permissionSubscriberRead);
        }

        if (!await db.Permissions.AnyAsync(x => x.Code == "Subscriber.Create", cancellationToken))
        {
            db.Permissions.Add(permissionSubscriberCreate);
        }

        if (!await db.Permissions.AnyAsync(x => x.Code == "Subscriber.Update", cancellationToken))
        {
            db.Permissions.Add(permissionSubscriberUpdate);
        }

        if (!await db.Permissions.AnyAsync(x => x.Code == "Subscriber.Delete", cancellationToken))
        {
            db.Permissions.Add(permissionSubscriberDelete);
        }

        if (!await db.Permissions.AnyAsync(x => x.Code == "Lead.Read", cancellationToken))
        {
            db.Permissions.Add(permissionLeadRead);
        }

        if (!await db.Permissions.AnyAsync(x => x.Code == "Lead.Create", cancellationToken))
        {
            db.Permissions.Add(permissionLeadCreate);
        }

        if (!await db.Permissions.AnyAsync(x => x.Code == "Lead.Update", cancellationToken))
        {
            db.Permissions.Add(permissionLeadUpdate);
        }

        if (!await db.Permissions.AnyAsync(x => x.Code == "Lead.Delete", cancellationToken))
        {
            db.Permissions.Add(permissionLeadDelete);
        }

        if (!await db.Permissions.AnyAsync(x => x.Code == "Campaign.Read", cancellationToken))
        {
            db.Permissions.Add(permissionCampaignRead);
        }

        if (!await db.Permissions.AnyAsync(x => x.Code == "Campaign.Create", cancellationToken))
        {
            db.Permissions.Add(permissionCampaignCreate);
        }

        if (!await db.Permissions.AnyAsync(x => x.Code == "Campaign.Update", cancellationToken))
        {
            db.Permissions.Add(permissionCampaignUpdate);
        }

        if (!await db.Permissions.AnyAsync(x => x.Code == "Campaign.Delete", cancellationToken))
        {
            db.Permissions.Add(permissionCampaignDelete);
        }

        if (!await db.RolePermissions.AnyAsync(x => x.RoleId == rolePermissionAdminSubscriberRead.RoleId && x.PermissionId == rolePermissionAdminSubscriberRead.PermissionId, cancellationToken))
        {
            db.RolePermissions.Add(rolePermissionAdminSubscriberRead);
        }

        if (!await db.RolePermissions.AnyAsync(x => x.RoleId == rolePermissionAdminSubscriberCreate.RoleId && x.PermissionId == rolePermissionAdminSubscriberCreate.PermissionId, cancellationToken))
        {
            db.RolePermissions.Add(rolePermissionAdminSubscriberCreate);
        }

        if (!await db.RolePermissions.AnyAsync(x => x.RoleId == rolePermissionAdminSubscriberUpdate.RoleId && x.PermissionId == rolePermissionAdminSubscriberUpdate.PermissionId, cancellationToken))
        {
            db.RolePermissions.Add(rolePermissionAdminSubscriberUpdate);
        }

        if (!await db.RolePermissions.AnyAsync(x => x.RoleId == rolePermissionAdminSubscriberDelete.RoleId && x.PermissionId == rolePermissionAdminSubscriberDelete.PermissionId, cancellationToken))
        {
            db.RolePermissions.Add(rolePermissionAdminSubscriberDelete);
        }

        if (!await db.RolePermissions.AnyAsync(x => x.RoleId == rolePermissionAdminLeadRead.RoleId && x.PermissionId == rolePermissionAdminLeadRead.PermissionId, cancellationToken))
        {
            db.RolePermissions.Add(rolePermissionAdminLeadRead);
        }

        if (!await db.RolePermissions.AnyAsync(x => x.RoleId == rolePermissionAdminLeadCreate.RoleId && x.PermissionId == rolePermissionAdminLeadCreate.PermissionId, cancellationToken))
        {
            db.RolePermissions.Add(rolePermissionAdminLeadCreate);
        }

        if (!await db.RolePermissions.AnyAsync(x => x.RoleId == rolePermissionAdminLeadUpdate.RoleId && x.PermissionId == rolePermissionAdminLeadUpdate.PermissionId, cancellationToken))
        {
            db.RolePermissions.Add(rolePermissionAdminLeadUpdate);
        }

        if (!await db.RolePermissions.AnyAsync(x => x.RoleId == rolePermissionAdminLeadDelete.RoleId && x.PermissionId == rolePermissionAdminLeadDelete.PermissionId, cancellationToken))
        {
            db.RolePermissions.Add(rolePermissionAdminLeadDelete);
        }

        if (!await db.RolePermissions.AnyAsync(x => x.RoleId == rolePermissionAdminCampaignRead.RoleId && x.PermissionId == rolePermissionAdminCampaignRead.PermissionId, cancellationToken))
        {
            db.RolePermissions.Add(rolePermissionAdminCampaignRead);
        }

        if (!await db.RolePermissions.AnyAsync(x => x.RoleId == rolePermissionAdminCampaignCreate.RoleId && x.PermissionId == rolePermissionAdminCampaignCreate.PermissionId, cancellationToken))
        {
            db.RolePermissions.Add(rolePermissionAdminCampaignCreate);
        }

        if (!await db.RolePermissions.AnyAsync(x => x.RoleId == rolePermissionAdminCampaignUpdate.RoleId && x.PermissionId == rolePermissionAdminCampaignUpdate.PermissionId, cancellationToken))
        {
            db.RolePermissions.Add(rolePermissionAdminCampaignUpdate);
        }

        if (!await db.RolePermissions.AnyAsync(x => x.RoleId == rolePermissionAdminCampaignDelete.RoleId && x.PermissionId == rolePermissionAdminCampaignDelete.PermissionId, cancellationToken))
        {
            db.RolePermissions.Add(rolePermissionAdminCampaignDelete);
        }

        if (!await db.Subscribers.AnyAsync(cancellationToken))
        {
            db.Subscribers.Add(subscriber);
            db.Leads.Add(lead);
            db.Campaigns.Add(campaign);
        }
        await db.SaveChangesAsync(cancellationToken);
    }

    private static async Task UpsertSeedHistoryAsync(
        TelegramOperationsAdminDbContext db,
        AppForgeSeedHistory entry,
        CancellationToken cancellationToken)
    {
        var existing = await db.AppForgeSeedHistory.FirstOrDefaultAsync(
            x => x.ModelId == entry.ModelId
                && x.ModelVersion == entry.ModelVersion
                && x.SeedSetName == entry.SeedSetName
                && x.TableName == entry.TableName,
            cancellationToken);

        if (existing is null)
        {
            db.AppForgeSeedHistory.Add(entry);
            return;
        }

        existing.SourceMdHash = entry.SourceMdHash;
        existing.SeedHash = entry.SeedHash;
        existing.AppliedAt = entry.AppliedAt;
    }

    private static string NormalizeSearchValue(string? value)
    {
        return value?.Trim().ToUpperInvariant() ?? string.Empty;
    }
}
