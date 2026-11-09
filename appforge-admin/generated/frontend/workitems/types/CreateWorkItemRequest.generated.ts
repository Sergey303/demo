// ------------------------------------------------------------------------------
// GENERATED FILE - source: workitems/types.json
// DO NOT EDIT MANUALLY.
// ------------------------------------------------------------------------------

export interface CreateWorkItemRequest {
  "assignee"?: string | null;
  "note"?: string | null;
  "serviceRequestId": string;
  "status"?: string | null;
  "title": string;
}
export const CreateWorkItemRequestTypeKey = "Demo.BusinessOperations.Api.Contracts.CreateWorkItemRequest" as const;
