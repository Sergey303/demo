#nullable enable

using Demo.BusinessOperations;
using Demo.BusinessOperations.Api.Contracts;
using Demo.BusinessOperations.Api.Services;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;

namespace Demo.BusinessOperations.Api.Customization;

public static class GeneratedRestCrudServiceRegistration
{
    public static IServiceCollection AddGeneratedRestCrudServices(
        this IServiceCollection services)
    {
        ArgumentNullException.ThrowIfNull(services);
        services.AddScoped<CustomerService>();
        services.AddScoped<CustomerDefaultCreateMutator>();
        services.AddScoped<CustomerDefaultUpdateMutator>();
        services.AddScoped<CustomerDefaultDeleteMutator>();
        services.TryAddScoped<IRestCreateMutator<Customer, CreateCustomerRequest>, CustomerDefaultCreateMutator>();
        services.TryAddScoped<IRestUpdateMutator<Customer, UpdateCustomerRequest>, CustomerDefaultUpdateMutator>();
        services.TryAddScoped<IRestDeleteMutator<Customer>, CustomerDefaultDeleteMutator>();
        services.AddScoped<IRestCreateValidator<Customer, CreateCustomerRequest>, CustomerStandardCreateValidator>();
        services.AddScoped<IRestUpdateValidator<Customer, UpdateCustomerRequest>, CustomerStandardUpdateValidator>();
        services.AddScoped<ServiceRequestService>();
        services.AddScoped<ServiceRequestDefaultCreateMutator>();
        services.AddScoped<ServiceRequestDefaultUpdateMutator>();
        services.AddScoped<ServiceRequestDefaultDeleteMutator>();
        services.TryAddScoped<IRestCreateMutator<ServiceRequest, CreateServiceRequestRequest>, ServiceRequestDefaultCreateMutator>();
        services.TryAddScoped<IRestUpdateMutator<ServiceRequest, UpdateServiceRequestRequest>, ServiceRequestDefaultUpdateMutator>();
        services.TryAddScoped<IRestDeleteMutator<ServiceRequest>, ServiceRequestDefaultDeleteMutator>();
        services.AddScoped<IRestCreateValidator<ServiceRequest, CreateServiceRequestRequest>, ServiceRequestStandardCreateValidator>();
        services.AddScoped<IRestUpdateValidator<ServiceRequest, UpdateServiceRequestRequest>, ServiceRequestStandardUpdateValidator>();
        services.AddScoped<WorkItemService>();
        services.AddScoped<WorkItemDefaultCreateMutator>();
        services.AddScoped<WorkItemDefaultUpdateMutator>();
        services.AddScoped<WorkItemDefaultDeleteMutator>();
        services.TryAddScoped<IRestCreateMutator<WorkItem, CreateWorkItemRequest>, WorkItemDefaultCreateMutator>();
        services.TryAddScoped<IRestUpdateMutator<WorkItem, UpdateWorkItemRequest>, WorkItemDefaultUpdateMutator>();
        services.TryAddScoped<IRestDeleteMutator<WorkItem>, WorkItemDefaultDeleteMutator>();
        services.AddScoped<IRestCreateValidator<WorkItem, CreateWorkItemRequest>, WorkItemStandardCreateValidator>();
        services.AddScoped<IRestUpdateValidator<WorkItem, UpdateWorkItemRequest>, WorkItemStandardUpdateValidator>();
        services.AddScoped<RoleService>();
        services.AddScoped<RoleDefaultCreateMutator>();
        services.AddScoped<RoleDefaultUpdateMutator>();
        services.AddScoped<RoleDefaultDeleteMutator>();
        services.TryAddScoped<IRestCreateMutator<Role, CreateRoleRequest>, RoleDefaultCreateMutator>();
        services.TryAddScoped<IRestUpdateMutator<Role, UpdateRoleRequest>, RoleDefaultUpdateMutator>();
        services.TryAddScoped<IRestDeleteMutator<Role>, RoleDefaultDeleteMutator>();
        services.AddScoped<IRestCreateValidator<Role, CreateRoleRequest>, RoleStandardCreateValidator>();
        services.AddScoped<IRestUpdateValidator<Role, UpdateRoleRequest>, RoleStandardUpdateValidator>();
        services.AddScoped<PermissionService>();
        services.AddScoped<PermissionDefaultCreateMutator>();
        services.AddScoped<PermissionDefaultUpdateMutator>();
        services.AddScoped<PermissionDefaultDeleteMutator>();
        services.TryAddScoped<IRestCreateMutator<Permission, CreatePermissionRequest>, PermissionDefaultCreateMutator>();
        services.TryAddScoped<IRestUpdateMutator<Permission, UpdatePermissionRequest>, PermissionDefaultUpdateMutator>();
        services.TryAddScoped<IRestDeleteMutator<Permission>, PermissionDefaultDeleteMutator>();
        services.AddScoped<IRestCreateValidator<Permission, CreatePermissionRequest>, PermissionStandardCreateValidator>();
        services.AddScoped<IRestUpdateValidator<Permission, UpdatePermissionRequest>, PermissionStandardUpdateValidator>();
        services.AddScoped<RolePermissionService>();
        services.AddScoped<RolePermissionDefaultCreateMutator>();
        services.AddScoped<RolePermissionDefaultUpdateMutator>();
        services.AddScoped<RolePermissionDefaultDeleteMutator>();
        services.TryAddScoped<IRestCreateMutator<RolePermission, CreateRolePermissionRequest>, RolePermissionDefaultCreateMutator>();
        services.TryAddScoped<IRestUpdateMutator<RolePermission, UpdateRolePermissionRequest>, RolePermissionDefaultUpdateMutator>();
        services.TryAddScoped<IRestDeleteMutator<RolePermission>, RolePermissionDefaultDeleteMutator>();
        services.AddScoped<IRestCreateValidator<RolePermission, CreateRolePermissionRequest>, RolePermissionStandardCreateValidator>();
        services.AddScoped<IRestUpdateValidator<RolePermission, UpdateRolePermissionRequest>, RolePermissionStandardUpdateValidator>();
        services.AddScoped<RestCrudMutationIdempotencyService>();
        return services;
    }
}
