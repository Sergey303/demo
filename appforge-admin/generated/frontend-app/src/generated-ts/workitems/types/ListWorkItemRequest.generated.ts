// ------------------------------------------------------------------------------
// GENERATED FILE - source: workitems/types.json
// DO NOT EDIT MANUALLY.
// ------------------------------------------------------------------------------

import type { ListWorkItemFilter } from "./ListWorkItemFilter.generated";
import type { ListWorkItemSort } from "./ListWorkItemSort.generated";

export interface ListWorkItemRequest {
  "filters": ListWorkItemFilter[];
  "page": number;
  "pageSize": number;
  "sort": ListWorkItemSort[];
}
export const ListWorkItemRequestTypeKey = "Demo.BusinessOperations.Api.Contracts.ListWorkItemRequest" as const;
