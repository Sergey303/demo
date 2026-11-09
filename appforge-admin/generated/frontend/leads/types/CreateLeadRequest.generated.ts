// ------------------------------------------------------------------------------
// GENERATED FILE - source: leads/types.json
// DO NOT EDIT MANUALLY.
// ------------------------------------------------------------------------------

export interface CreateLeadRequest {
  "createdAt": string;
  "note"?: string | null;
  "owner"?: string | null;
  "statusId": string;
  "subject": string;
  "subscriberId": string;
}
export const CreateLeadRequestTypeKey = "Demo.TelegramOperations.Api.Contracts.CreateLeadRequest" as const;
