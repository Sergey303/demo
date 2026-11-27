using Demo.BusinessOperations;
using Demo.BusinessOperations.Api.Contracts;
using Demo.BusinessOperations.Api.Customization;
using Demo.BusinessOperations.Persistence;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;

namespace BusinessWorkflow;

// Check the exact pre-validated snapshot under the row lock, inside the
// generator's existing idempotency transaction. Delegate all writes to the
// generated mutator; receipt and state still commit together.
public sealed class TaskUpdateGuard(BusinessOperationsAdminDbContext db,
    WorkItemDefaultUpdateMutator generated)
    : IRestUpdateMutator<WorkItem, UpdateWorkItemRequest>
{
    public async Task<WorkItem> MutateAsync(WorkItem entity, UpdateWorkItemRequest request,
        RestCrudMutationContext context, CancellationToken cancellationToken)
    {
        var transaction = db.Database.CurrentTransaction
            ?? throw new InvalidOperationException("Workflow update requires an active mutation transaction.");
        await using (var command = db.Database.GetDbConnection().CreateCommand())
        {
            command.Transaction = transaction.GetDbTransaction();
            command.CommandText = """
                SELECT "ServiceRequestId", "Title", "Assignee", "Status", "Note",
                       "LastModificationTime", "IsDeleted"
                FROM "WorkItems" WHERE "Id" = @id FOR UPDATE
                """;
            var parameter = command.CreateParameter();
            parameter.ParameterName = "id";
            parameter.Value = entity.Id;
            command.Parameters.Add(parameter);
            await using var reader = await command.ExecuteReaderAsync(cancellationToken);
            if (!await reader.ReadAsync(cancellationToken)
                || reader.GetGuid(0) != entity.ServiceRequestId
                || reader.GetString(1) != entity.Title
                || ReadString(reader, 2) != entity.Assignee
                || ReadString(reader, 3) != entity.Status
                || ReadString(reader, 4) != entity.Note
                || (reader.IsDBNull(5) ? (DateTime?)null : reader.GetDateTime(5)) != entity.LastModificationTime
                || reader.GetBoolean(6))
                throw new StaleTaskException();
        }

        return await generated.MutateAsync(entity, request, context, cancellationToken);
    }

    private static string? ReadString(System.Data.Common.DbDataReader reader, int ordinal) =>
        reader.IsDBNull(ordinal) ? null : reader.GetString(ordinal);
}

internal sealed class StaleTaskException : Exception;

public sealed class StaleTaskFilter : IExceptionFilter
{
    public void OnException(ExceptionContext context)
    {
        if (context.Exception is not StaleTaskException) return;
        context.Result = new ConflictObjectResult(new { code = "workflow.stale_task", target = "Id", retryable = false });
        context.ExceptionHandled = true;
    }
}
