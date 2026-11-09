// ------------------------------------------------------------------------------
// GENERATED FILE - source: workitems/types.json
// DO NOT EDIT MANUALLY.
// ------------------------------------------------------------------------------

import type { WorkItemDto } from "./WorkItemDto.generated";

export interface ListWorkItemResult {
  "items": WorkItemDto[];
  "page": number;
  "pageSize": number;
  "totalCount": number;
}
export const ListWorkItemResultTypeKey = "Demo.BusinessOperations.Api.Contracts.ListWorkItemResult" as const;
