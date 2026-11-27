using Demo.BusinessOperations;
using Demo.BusinessOperations.Api.Contracts;
using Demo.BusinessOperations.Api.Customization;
using Demo.BusinessOperations.Persistence;
using Microsoft.EntityFrameworkCore;

namespace BusinessWorkflow;

internal static class Rule
{
    internal const string New = "Новая", Active = "В работе", Done = "Выполнена";
    internal static readonly RestCrudValidationResult Valid = RestCrudValidationResult.Valid;
    internal static RestCrudValidationResult Reject(string code, string target) =>
        RestCrudValidationResult.Failure(RestCrudValidationFailureKind.Validation, code, target);
    internal static bool Person(string? name) => string.IsNullOrEmpty(name) || name is "Анна" or "Илья" or "Марина";
    internal static string? Normalize(string? value) => string.IsNullOrWhiteSpace(value) ? null : value.Trim();
}

public sealed class TaskRules(BusinessOperationsAdminDbContext db) :
    IRestCreateValidator<WorkItem, CreateWorkItemRequest>,
    IRestUpdateValidator<WorkItem, UpdateWorkItemRequest>,
    IRestDeleteValidator<WorkItem>
{
    public async ValueTask<RestCrudValidationResult> ValidateAsync(
        CreateWorkItemRequest request, RestCrudMutationContext context, CancellationToken token)
    {
        if (request.Status != Rule.New || Rule.Normalize(request.Note) is not null)
            return Rule.Reject("workflow.new_only", "Status");
        if (!Rule.Person(request.Assignee)) return Rule.Reject("workflow.assignee", "Assignee");
        return await ParentExists(request.ServiceRequestId, token);
    }

    public async ValueTask<RestCrudValidationResult> ValidateAsync(
        WorkItem old, UpdateWorkItemRequest next, RestCrudMutationContext context, CancellationToken token)
    {
        if (old.ServiceRequestId != next.ServiceRequestId)
            return Rule.Reject("workflow.immutable_parent", "ServiceRequestId");
        var parent = await ParentExists(next.ServiceRequestId, token);
        if (!parent.IsValid) return parent;
        if (!Rule.Person(next.Assignee)) return Rule.Reject("workflow.assignee", "Assignee");
        var assignee = Rule.Normalize(next.Assignee);
        var changed = assignee != Rule.Normalize(old.Assignee);
        var noteChanged = Rule.Normalize(next.Note) != Rule.Normalize(old.Note);
        if (next.Status is not (Rule.New or Rule.Active or Rule.Done))
            return Rule.Reject("workflow.invalid_status", "Status");
        if (changed && (old.Status == Rule.Done || (old.Status == Rule.Active && assignee is null)))
            return Rule.Reject("workflow.assignment_locked", "Assignee");
        if (next.Status != Rule.New && assignee is null)
            return Rule.Reject("workflow.assignee_required", "Assignee");
        if (old.Status == next.Status)
            return old.Status == Rule.Done && (noteChanged || old.Title != next.Title)
                ? Rule.Reject("workflow.reopen_first", "Status") : Rule.Valid;
        if (changed) return Rule.Reject("workflow.separate_assignment", "Assignee");
        if (old.Status == Rule.New && next.Status == Rule.Active && !noteChanged) return Rule.Valid;
        if (old.Status == Rule.Active && next.Status == Rule.Done)
            return Rule.Normalize(next.Note) is not null ? Rule.Valid : Rule.Reject("workflow.result_required", "Note");
        if (old.Status == Rule.Done && next.Status == Rule.Active && !noteChanged) return Rule.Valid;
        return Rule.Reject("workflow.invalid_transition", "Status");
    }

    public ValueTask<RestCrudValidationResult> ValidateAsync(
        WorkItem entity, RestCrudMutationContext context, CancellationToken token) =>
        ValueTask.FromResult(Rule.Reject("workflow.no_task_delete", "Id"));

    private async ValueTask<RestCrudValidationResult> ParentExists(Guid id, CancellationToken token) =>
        await db.ServiceRequests.AnyAsync(x => x.Id == id && !x.IsDeleted, token)
            ? Rule.Valid : Rule.Reject("workflow.request_missing", "ServiceRequestId");
}
