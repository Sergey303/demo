#nullable enable

using Demo.TelegramOperations;
using Demo.TelegramOperations.Api.Contracts;
using Demo.TelegramOperations.Api.Services;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;

namespace Demo.TelegramOperations.Api.Customization;

public static class GeneratedRestCrudServiceRegistration
{
    public static IServiceCollection AddGeneratedRestCrudServices(
        this IServiceCollection services)
    {
        ArgumentNullException.ThrowIfNull(services);
        services.AddScoped<SubscriberService>();
        services.AddScoped<SubscriberDefaultCreateMutator>();
        services.AddScoped<SubscriberDefaultUpdateMutator>();
        services.AddScoped<SubscriberDefaultDeleteMutator>();
        services.TryAddScoped<IRestCreateMutator<Subscriber, CreateSubscriberRequest>, SubscriberDefaultCreateMutator>();
        services.TryAddScoped<IRestUpdateMutator<Subscriber, UpdateSubscriberRequest>, SubscriberDefaultUpdateMutator>();
        services.TryAddScoped<IRestDeleteMutator<Subscriber>, SubscriberDefaultDeleteMutator>();
        services.AddScoped<IRestCreateValidator<Subscriber, CreateSubscriberRequest>, SubscriberStandardCreateValidator>();
        services.AddScoped<IRestUpdateValidator<Subscriber, UpdateSubscriberRequest>, SubscriberStandardUpdateValidator>();
        services.AddScoped<SubscriberStatusService>();
        services.AddScoped<SubscriberStatusDefaultCreateMutator>();
        services.AddScoped<SubscriberStatusDefaultUpdateMutator>();
        services.AddScoped<SubscriberStatusDefaultDeleteMutator>();
        services.TryAddScoped<IRestCreateMutator<SubscriberStatus, CreateSubscriberStatusRequest>, SubscriberStatusDefaultCreateMutator>();
        services.TryAddScoped<IRestUpdateMutator<SubscriberStatus, UpdateSubscriberStatusRequest>, SubscriberStatusDefaultUpdateMutator>();
        services.TryAddScoped<IRestDeleteMutator<SubscriberStatus>, SubscriberStatusDefaultDeleteMutator>();
        services.AddScoped<IRestCreateValidator<SubscriberStatus, CreateSubscriberStatusRequest>, SubscriberStatusStandardCreateValidator>();
        services.AddScoped<IRestUpdateValidator<SubscriberStatus, UpdateSubscriberStatusRequest>, SubscriberStatusStandardUpdateValidator>();
        services.AddScoped<LeadService>();
        services.AddScoped<LeadDefaultCreateMutator>();
        services.AddScoped<LeadDefaultUpdateMutator>();
        services.AddScoped<LeadDefaultDeleteMutator>();
        services.TryAddScoped<IRestCreateMutator<Lead, CreateLeadRequest>, LeadDefaultCreateMutator>();
        services.TryAddScoped<IRestUpdateMutator<Lead, UpdateLeadRequest>, LeadDefaultUpdateMutator>();
        services.TryAddScoped<IRestDeleteMutator<Lead>, LeadDefaultDeleteMutator>();
        services.AddScoped<IRestCreateValidator<Lead, CreateLeadRequest>, LeadStandardCreateValidator>();
        services.AddScoped<IRestUpdateValidator<Lead, UpdateLeadRequest>, LeadStandardUpdateValidator>();
        services.AddScoped<LeadStatusService>();
        services.AddScoped<LeadStatusDefaultCreateMutator>();
        services.AddScoped<LeadStatusDefaultUpdateMutator>();
        services.AddScoped<LeadStatusDefaultDeleteMutator>();
        services.TryAddScoped<IRestCreateMutator<LeadStatus, CreateLeadStatusRequest>, LeadStatusDefaultCreateMutator>();
        services.TryAddScoped<IRestUpdateMutator<LeadStatus, UpdateLeadStatusRequest>, LeadStatusDefaultUpdateMutator>();
        services.TryAddScoped<IRestDeleteMutator<LeadStatus>, LeadStatusDefaultDeleteMutator>();
        services.AddScoped<IRestCreateValidator<LeadStatus, CreateLeadStatusRequest>, LeadStatusStandardCreateValidator>();
        services.AddScoped<IRestUpdateValidator<LeadStatus, UpdateLeadStatusRequest>, LeadStatusStandardUpdateValidator>();
        services.AddScoped<CampaignService>();
        services.AddScoped<CampaignDefaultCreateMutator>();
        services.AddScoped<CampaignDefaultUpdateMutator>();
        services.AddScoped<CampaignDefaultDeleteMutator>();
        services.TryAddScoped<IRestCreateMutator<Campaign, CreateCampaignRequest>, CampaignDefaultCreateMutator>();
        services.TryAddScoped<IRestUpdateMutator<Campaign, UpdateCampaignRequest>, CampaignDefaultUpdateMutator>();
        services.TryAddScoped<IRestDeleteMutator<Campaign>, CampaignDefaultDeleteMutator>();
        services.AddScoped<IRestCreateValidator<Campaign, CreateCampaignRequest>, CampaignStandardCreateValidator>();
        services.AddScoped<IRestUpdateValidator<Campaign, UpdateCampaignRequest>, CampaignStandardUpdateValidator>();
        services.AddScoped<CampaignStatusService>();
        services.AddScoped<CampaignStatusDefaultCreateMutator>();
        services.AddScoped<CampaignStatusDefaultUpdateMutator>();
        services.AddScoped<CampaignStatusDefaultDeleteMutator>();
        services.TryAddScoped<IRestCreateMutator<CampaignStatus, CreateCampaignStatusRequest>, CampaignStatusDefaultCreateMutator>();
        services.TryAddScoped<IRestUpdateMutator<CampaignStatus, UpdateCampaignStatusRequest>, CampaignStatusDefaultUpdateMutator>();
        services.TryAddScoped<IRestDeleteMutator<CampaignStatus>, CampaignStatusDefaultDeleteMutator>();
        services.AddScoped<IRestCreateValidator<CampaignStatus, CreateCampaignStatusRequest>, CampaignStatusStandardCreateValidator>();
        services.AddScoped<IRestUpdateValidator<CampaignStatus, UpdateCampaignStatusRequest>, CampaignStatusStandardUpdateValidator>();
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
