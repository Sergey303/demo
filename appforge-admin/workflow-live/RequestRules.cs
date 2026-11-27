using Demo.BusinessOperations;
using Demo.BusinessOperations.Api.Contracts;
using Demo.BusinessOperations.Api.Customization;
using Demo.BusinessOperations.Persistence;
using Microsoft.EntityFrameworkCore;

namespace BusinessWorkflow;

public sealed class RequestRules(BusinessOperationsAdminDbContext db) :
    IRestCreateValidator<ServiceRequest, CreateServiceRequestRequest>,
    IRestUpdateValidator<ServiceRequest, UpdateServiceRequestRequest>,
    IRestDeleteValidator<ServiceRequest>
{
    public ValueTask<RestCrudValidationResult> ValidateAsync(
        CreateServiceRequestRequest request, RestCrudMutationContext context, CancellationToken token) =>
        ValidateParent(request.CustomerId, request.Priority, token);

    public ValueTask<RestCrudValidationResult> ValidateAsync(
        ServiceRequest entity, UpdateServiceRequestRequest request, RestCrudMutationContext context, CancellationToken token) =>
        ValidateParent(request.CustomerId, request.Priority, token);

    public ValueTask<RestCrudValidationResult> ValidateAsync(
        ServiceRequest entity, RestCrudMutationContext context, CancellationToken token) =>
        ValueTask.FromResult(Rule.Reject("workflow.no_request_delete", "Id"));

    private async ValueTask<RestCrudValidationResult> ValidateParent(Guid id, string? priority, CancellationToken token)
    {
        if (priority is not ("Обычный" or "Высокий"))
            return Rule.Reject("workflow.priority", "Priority");
        return await db.Customers.AnyAsync(x => x.Id == id && !x.IsDeleted, token)
            ? Rule.Valid : Rule.Reject("workflow.customer_missing", "CustomerId");
    }
}

public sealed class CustomerDeleteRules : IRestDeleteValidator<Customer>
{
    public ValueTask<RestCrudValidationResult> ValidateAsync(
        Customer entity, RestCrudMutationContext context, CancellationToken token) =>
        ValueTask.FromResult(Rule.Reject("workflow.no_customer_delete", "Id"));
}
