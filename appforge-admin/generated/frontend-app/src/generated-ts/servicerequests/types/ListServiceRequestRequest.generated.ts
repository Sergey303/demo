// ------------------------------------------------------------------------------
// GENERATED FILE - source: servicerequests/types.json
// DO NOT EDIT MANUALLY.
// ------------------------------------------------------------------------------

import type { ListServiceRequestFilter } from "./ListServiceRequestFilter.generated";
import type { ListServiceRequestSort } from "./ListServiceRequestSort.generated";

export interface ListServiceRequestRequest {
  "filters": ListServiceRequestFilter[];
  "page": number;
  "pageSize": number;
  "sort": ListServiceRequestSort[];
}
export const ListServiceRequestRequestTypeKey = "Demo.BusinessOperations.Api.Contracts.ListServiceRequestRequest" as const;
