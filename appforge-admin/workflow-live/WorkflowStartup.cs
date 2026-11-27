using Demo.BusinessOperations;
using Demo.BusinessOperations.Api.Contracts;
using Demo.BusinessOperations.Api.Customization;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.DependencyInjection;

[assembly: HostingStartup(typeof(BusinessWorkflow.WorkflowStartup))]

namespace BusinessWorkflow;

// Consumer-specific rules. Generated controllers, contracts and mutators are
// unchanged; generated CRUD services consume these validators through DI.
public sealed class WorkflowStartup : IHostingStartup
{
    public void Configure(IWebHostBuilder builder)
    {
        builder.ConfigureServices(services =>
        {
            services.AddScoped<IRestUpdateMutator<WorkItem, UpdateWorkItemRequest>, TaskUpdateGuard>();
            services.Configure<MvcOptions>(options => options.Filters.Add<StaleTaskFilter>());
            services.AddScoped<IRestCreateValidator<WorkItem, CreateWorkItemRequest>, TaskRules>();
            services.AddScoped<IRestUpdateValidator<WorkItem, UpdateWorkItemRequest>, TaskRules>();
            services.AddScoped<IRestCreateValidator<ServiceRequest, CreateServiceRequestRequest>, RequestRules>();
            services.AddScoped<IRestUpdateValidator<ServiceRequest, UpdateServiceRequestRequest>, RequestRules>();
            services.AddScoped<IRestDeleteValidator<Customer>, CustomerDeleteRules>();
            services.AddScoped<IRestDeleteValidator<ServiceRequest>, RequestRules>();
            services.AddScoped<IRestDeleteValidator<WorkItem>, TaskRules>();
        });
    }
}
