#nullable enable

using Demo.BusinessOperations;
using Microsoft.EntityFrameworkCore;

namespace Demo.BusinessOperations.Persistence;

internal static class PreviewSeedData
{
    public static async Task SeedAsync(
        BusinessOperationsAdminDbContext db,
        CancellationToken cancellationToken = default)
    {
        var roleAdmin = new Role
        {
            Id = Guid.Parse("51d1a9a0-0203-5c3e-83ed-0aae24a61d6d"),
            Code = "Admin",
            Name = "Admin",
        };

        var permissionCustomerRead = new Permission
        {
            Id = Guid.Parse("046ba712-f87c-584d-97bf-86858eb58ab1"),
            Code = "Customer.Read",
            Name = "Customer Read",
        };

        var permissionCustomerCreate = new Permission
        {
            Id = Guid.Parse("fad2610a-2caa-5c76-90b0-72e4adbc954d"),
            Code = "Customer.Create",
            Name = "Customer Create",
        };

        var permissionCustomerUpdate = new Permission
        {
            Id = Guid.Parse("a93f528b-5486-5787-9ec2-4bdb28d91597"),
            Code = "Customer.Update",
            Name = "Customer Update",
        };

        var permissionCustomerDelete = new Permission
        {
            Id = Guid.Parse("7ea09e08-71d2-5c28-8528-08b598a3b7e8"),
            Code = "Customer.Delete",
            Name = "Customer Delete",
        };

        var permissionServiceRequestRead = new Permission
        {
            Id = Guid.Parse("ac7c6d72-9f5a-522c-aa3b-e445362fe2b5"),
            Code = "ServiceRequest.Read",
            Name = "ServiceRequest Read",
        };

        var permissionServiceRequestCreate = new Permission
        {
            Id = Guid.Parse("4f525663-4e61-5d82-9e41-63fe04089a8a"),
            Code = "ServiceRequest.Create",
            Name = "ServiceRequest Create",
        };

        var permissionServiceRequestUpdate = new Permission
        {
            Id = Guid.Parse("4a39e60b-2eb2-51c2-9d99-481aedebfd9b"),
            Code = "ServiceRequest.Update",
            Name = "ServiceRequest Update",
        };

        var permissionServiceRequestDelete = new Permission
        {
            Id = Guid.Parse("62aaa43b-fa2d-5b6e-ad79-3f3bb1005e2a"),
            Code = "ServiceRequest.Delete",
            Name = "ServiceRequest Delete",
        };

        var permissionWorkItemRead = new Permission
        {
            Id = Guid.Parse("6d367c55-bb70-513e-a33f-96f323af234c"),
            Code = "WorkItem.Read",
            Name = "WorkItem Read",
        };

        var permissionWorkItemCreate = new Permission
        {
            Id = Guid.Parse("dbaf8889-0c32-5a63-98b5-927be679036a"),
            Code = "WorkItem.Create",
            Name = "WorkItem Create",
        };

        var permissionWorkItemUpdate = new Permission
        {
            Id = Guid.Parse("7057329f-760d-598b-9933-6765a2f5e5dc"),
            Code = "WorkItem.Update",
            Name = "WorkItem Update",
        };

        var permissionWorkItemDelete = new Permission
        {
            Id = Guid.Parse("329efd44-a577-5737-9a79-00ef4bd663b4"),
            Code = "WorkItem.Delete",
            Name = "WorkItem Delete",
        };

        var rolePermissionAdminCustomerRead = new RolePermission
        {
            Id = Guid.Parse("db919734-9549-5c4e-a769-929b4b5c8b6f"),
            RoleId = Guid.Parse("51d1a9a0-0203-5c3e-83ed-0aae24a61d6d"),
            PermissionId = Guid.Parse("046ba712-f87c-584d-97bf-86858eb58ab1"),
        };

        var rolePermissionAdminCustomerCreate = new RolePermission
        {
            Id = Guid.Parse("b5bc6681-ae1c-5af8-844a-7561fcfc3d58"),
            RoleId = Guid.Parse("51d1a9a0-0203-5c3e-83ed-0aae24a61d6d"),
            PermissionId = Guid.Parse("fad2610a-2caa-5c76-90b0-72e4adbc954d"),
        };

        var rolePermissionAdminCustomerUpdate = new RolePermission
        {
            Id = Guid.Parse("066af72c-c33c-5dd1-bf3d-17fccd793726"),
            RoleId = Guid.Parse("51d1a9a0-0203-5c3e-83ed-0aae24a61d6d"),
            PermissionId = Guid.Parse("a93f528b-5486-5787-9ec2-4bdb28d91597"),
        };

        var rolePermissionAdminCustomerDelete = new RolePermission
        {
            Id = Guid.Parse("6cfc2548-8f0d-5787-a4e7-eabcda9cc90e"),
            RoleId = Guid.Parse("51d1a9a0-0203-5c3e-83ed-0aae24a61d6d"),
            PermissionId = Guid.Parse("7ea09e08-71d2-5c28-8528-08b598a3b7e8"),
        };

        var rolePermissionAdminServiceRequestRead = new RolePermission
        {
            Id = Guid.Parse("0d93f19c-c220-5faf-9a0c-83187fd92739"),
            RoleId = Guid.Parse("51d1a9a0-0203-5c3e-83ed-0aae24a61d6d"),
            PermissionId = Guid.Parse("ac7c6d72-9f5a-522c-aa3b-e445362fe2b5"),
        };

        var rolePermissionAdminServiceRequestCreate = new RolePermission
        {
            Id = Guid.Parse("1fbf627f-c74e-5609-8a93-6aa403dc3333"),
            RoleId = Guid.Parse("51d1a9a0-0203-5c3e-83ed-0aae24a61d6d"),
            PermissionId = Guid.Parse("4f525663-4e61-5d82-9e41-63fe04089a8a"),
        };

        var rolePermissionAdminServiceRequestUpdate = new RolePermission
        {
            Id = Guid.Parse("055f91f7-7123-535c-9207-6d970bd4a2f1"),
            RoleId = Guid.Parse("51d1a9a0-0203-5c3e-83ed-0aae24a61d6d"),
            PermissionId = Guid.Parse("4a39e60b-2eb2-51c2-9d99-481aedebfd9b"),
        };

        var rolePermissionAdminServiceRequestDelete = new RolePermission
        {
            Id = Guid.Parse("43502b35-1fce-5806-a1e1-39cf9040bece"),
            RoleId = Guid.Parse("51d1a9a0-0203-5c3e-83ed-0aae24a61d6d"),
            PermissionId = Guid.Parse("62aaa43b-fa2d-5b6e-ad79-3f3bb1005e2a"),
        };

        var rolePermissionAdminWorkItemRead = new RolePermission
        {
            Id = Guid.Parse("769fc9f4-2173-5e32-bed2-1c3bdbff6753"),
            RoleId = Guid.Parse("51d1a9a0-0203-5c3e-83ed-0aae24a61d6d"),
            PermissionId = Guid.Parse("6d367c55-bb70-513e-a33f-96f323af234c"),
        };

        var rolePermissionAdminWorkItemCreate = new RolePermission
        {
            Id = Guid.Parse("11afcaa2-19ab-5d5d-bc38-1504a5b08d4b"),
            RoleId = Guid.Parse("51d1a9a0-0203-5c3e-83ed-0aae24a61d6d"),
            PermissionId = Guid.Parse("dbaf8889-0c32-5a63-98b5-927be679036a"),
        };

        var rolePermissionAdminWorkItemUpdate = new RolePermission
        {
            Id = Guid.Parse("e5140db7-d73e-5787-9119-2d60ea8e0b9a"),
            RoleId = Guid.Parse("51d1a9a0-0203-5c3e-83ed-0aae24a61d6d"),
            PermissionId = Guid.Parse("7057329f-760d-598b-9933-6765a2f5e5dc"),
        };

        var rolePermissionAdminWorkItemDelete = new RolePermission
        {
            Id = Guid.Parse("3ec57fc4-a61c-5c86-aa51-ec6e4ba5e1cd"),
            RoleId = Guid.Parse("51d1a9a0-0203-5c3e-83ed-0aae24a61d6d"),
            PermissionId = Guid.Parse("329efd44-a577-5737-9a79-00ef4bd663b4"),
        };


        var customer = new Customer
        {
            Id = Guid.Parse("b6687ca6-640d-5c8b-96b6-7430b90a1727"),
            Name = "Customer Name",
            Email = "Customer Email",
            Segment = "Customer Segment",
            Note = "Customer Note",
            CreationTime = new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc),
            CreatorId = null,
            LastModificationTime = null,
            LastModifierId = null,
            IsDeleted = false,
            DeletionTime = null,
            DeleterId = null,
            NameSearch = NormalizeSearchValue("Customer Name"),
            EmailSearch = NormalizeSearchValue("Customer Email"),
            SegmentSearch = NormalizeSearchValue("Customer Segment"),
            NoteSearch = NormalizeSearchValue("Customer Note"),
        };

        var serviceRequest = new ServiceRequest
        {
            Id = Guid.Parse("19f53c76-34e7-5c06-a8c6-bdca74dbc3ed"),
            CustomerId = Guid.Parse("b6687ca6-640d-5c8b-96b6-7430b90a1727"),
            Title = "ServiceRequest Title",
            Priority = "ServiceRequest Priority",
            Description = "ServiceRequest Description",
            CreationTime = new DateTime(2026, 1, 2, 0, 0, 0, DateTimeKind.Utc),
            CreatorId = null,
            LastModificationTime = null,
            LastModifierId = null,
            IsDeleted = false,
            DeletionTime = null,
            DeleterId = null,
            TitleSearch = NormalizeSearchValue("ServiceRequest Title"),
            PrioritySearch = NormalizeSearchValue("ServiceRequest Priority"),
            DescriptionSearch = NormalizeSearchValue("ServiceRequest Description"),
        };

        var workItem = new WorkItem
        {
            Id = Guid.Parse("87e35e4e-c51d-5d4f-b472-ee70babec02f"),
            ServiceRequestId = Guid.Parse("19f53c76-34e7-5c06-a8c6-bdca74dbc3ed"),
            Title = "WorkItem Title",
            Assignee = "WorkItem Assignee",
            Status = "WorkItem Status",
            Note = "WorkItem Note",
            CreationTime = new DateTime(2026, 1, 3, 0, 0, 0, DateTimeKind.Utc),
            CreatorId = null,
            LastModificationTime = null,
            LastModifierId = null,
            IsDeleted = false,
            DeletionTime = null,
            DeleterId = null,
            TitleSearch = NormalizeSearchValue("WorkItem Title"),
            AssigneeSearch = NormalizeSearchValue("WorkItem Assignee"),
            StatusSearch = NormalizeSearchValue("WorkItem Status"),
            NoteSearch = NormalizeSearchValue("WorkItem Note"),
        };

        if (!await db.Roles.AnyAsync(x => x.Code == "Admin", cancellationToken))
        {
            db.Roles.Add(roleAdmin);
        }

        if (!await db.Permissions.AnyAsync(x => x.Code == "Customer.Read", cancellationToken))
        {
            db.Permissions.Add(permissionCustomerRead);
        }

        if (!await db.Permissions.AnyAsync(x => x.Code == "Customer.Create", cancellationToken))
        {
            db.Permissions.Add(permissionCustomerCreate);
        }

        if (!await db.Permissions.AnyAsync(x => x.Code == "Customer.Update", cancellationToken))
        {
            db.Permissions.Add(permissionCustomerUpdate);
        }

        if (!await db.Permissions.AnyAsync(x => x.Code == "Customer.Delete", cancellationToken))
        {
            db.Permissions.Add(permissionCustomerDelete);
        }

        if (!await db.Permissions.AnyAsync(x => x.Code == "ServiceRequest.Read", cancellationToken))
        {
            db.Permissions.Add(permissionServiceRequestRead);
        }

        if (!await db.Permissions.AnyAsync(x => x.Code == "ServiceRequest.Create", cancellationToken))
        {
            db.Permissions.Add(permissionServiceRequestCreate);
        }

        if (!await db.Permissions.AnyAsync(x => x.Code == "ServiceRequest.Update", cancellationToken))
        {
            db.Permissions.Add(permissionServiceRequestUpdate);
        }

        if (!await db.Permissions.AnyAsync(x => x.Code == "ServiceRequest.Delete", cancellationToken))
        {
            db.Permissions.Add(permissionServiceRequestDelete);
        }

        if (!await db.Permissions.AnyAsync(x => x.Code == "WorkItem.Read", cancellationToken))
        {
            db.Permissions.Add(permissionWorkItemRead);
        }

        if (!await db.Permissions.AnyAsync(x => x.Code == "WorkItem.Create", cancellationToken))
        {
            db.Permissions.Add(permissionWorkItemCreate);
        }

        if (!await db.Permissions.AnyAsync(x => x.Code == "WorkItem.Update", cancellationToken))
        {
            db.Permissions.Add(permissionWorkItemUpdate);
        }

        if (!await db.Permissions.AnyAsync(x => x.Code == "WorkItem.Delete", cancellationToken))
        {
            db.Permissions.Add(permissionWorkItemDelete);
        }

        if (!await db.RolePermissions.AnyAsync(x => x.RoleId == rolePermissionAdminCustomerRead.RoleId && x.PermissionId == rolePermissionAdminCustomerRead.PermissionId, cancellationToken))
        {
            db.RolePermissions.Add(rolePermissionAdminCustomerRead);
        }

        if (!await db.RolePermissions.AnyAsync(x => x.RoleId == rolePermissionAdminCustomerCreate.RoleId && x.PermissionId == rolePermissionAdminCustomerCreate.PermissionId, cancellationToken))
        {
            db.RolePermissions.Add(rolePermissionAdminCustomerCreate);
        }

        if (!await db.RolePermissions.AnyAsync(x => x.RoleId == rolePermissionAdminCustomerUpdate.RoleId && x.PermissionId == rolePermissionAdminCustomerUpdate.PermissionId, cancellationToken))
        {
            db.RolePermissions.Add(rolePermissionAdminCustomerUpdate);
        }

        if (!await db.RolePermissions.AnyAsync(x => x.RoleId == rolePermissionAdminCustomerDelete.RoleId && x.PermissionId == rolePermissionAdminCustomerDelete.PermissionId, cancellationToken))
        {
            db.RolePermissions.Add(rolePermissionAdminCustomerDelete);
        }

        if (!await db.RolePermissions.AnyAsync(x => x.RoleId == rolePermissionAdminServiceRequestRead.RoleId && x.PermissionId == rolePermissionAdminServiceRequestRead.PermissionId, cancellationToken))
        {
            db.RolePermissions.Add(rolePermissionAdminServiceRequestRead);
        }

        if (!await db.RolePermissions.AnyAsync(x => x.RoleId == rolePermissionAdminServiceRequestCreate.RoleId && x.PermissionId == rolePermissionAdminServiceRequestCreate.PermissionId, cancellationToken))
        {
            db.RolePermissions.Add(rolePermissionAdminServiceRequestCreate);
        }

        if (!await db.RolePermissions.AnyAsync(x => x.RoleId == rolePermissionAdminServiceRequestUpdate.RoleId && x.PermissionId == rolePermissionAdminServiceRequestUpdate.PermissionId, cancellationToken))
        {
            db.RolePermissions.Add(rolePermissionAdminServiceRequestUpdate);
        }

        if (!await db.RolePermissions.AnyAsync(x => x.RoleId == rolePermissionAdminServiceRequestDelete.RoleId && x.PermissionId == rolePermissionAdminServiceRequestDelete.PermissionId, cancellationToken))
        {
            db.RolePermissions.Add(rolePermissionAdminServiceRequestDelete);
        }

        if (!await db.RolePermissions.AnyAsync(x => x.RoleId == rolePermissionAdminWorkItemRead.RoleId && x.PermissionId == rolePermissionAdminWorkItemRead.PermissionId, cancellationToken))
        {
            db.RolePermissions.Add(rolePermissionAdminWorkItemRead);
        }

        if (!await db.RolePermissions.AnyAsync(x => x.RoleId == rolePermissionAdminWorkItemCreate.RoleId && x.PermissionId == rolePermissionAdminWorkItemCreate.PermissionId, cancellationToken))
        {
            db.RolePermissions.Add(rolePermissionAdminWorkItemCreate);
        }

        if (!await db.RolePermissions.AnyAsync(x => x.RoleId == rolePermissionAdminWorkItemUpdate.RoleId && x.PermissionId == rolePermissionAdminWorkItemUpdate.PermissionId, cancellationToken))
        {
            db.RolePermissions.Add(rolePermissionAdminWorkItemUpdate);
        }

        if (!await db.RolePermissions.AnyAsync(x => x.RoleId == rolePermissionAdminWorkItemDelete.RoleId && x.PermissionId == rolePermissionAdminWorkItemDelete.PermissionId, cancellationToken))
        {
            db.RolePermissions.Add(rolePermissionAdminWorkItemDelete);
        }

        if (!await db.Customers.AnyAsync(cancellationToken))
        {
            db.Customers.Add(customer);
            db.ServiceRequests.Add(serviceRequest);
            db.WorkItems.Add(workItem);
        }
        await db.SaveChangesAsync(cancellationToken);
    }

    private static async Task UpsertSeedHistoryAsync(
        BusinessOperationsAdminDbContext db,
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
