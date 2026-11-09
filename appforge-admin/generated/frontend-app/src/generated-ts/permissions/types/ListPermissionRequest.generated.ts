// ------------------------------------------------------------------------------
// GENERATED FILE - source: permissions/types.json
// DO NOT EDIT MANUALLY.
// ------------------------------------------------------------------------------

import type { ListPermissionFilter } from "./ListPermissionFilter.generated";
import type { ListPermissionSort } from "./ListPermissionSort.generated";

export interface ListPermissionRequest {
  "filters": ListPermissionFilter[];
  "page": number;
  "pageSize": number;
  "sort": ListPermissionSort[];
}
export const ListPermissionRequestTypeKey = "Demo.BusinessOperations.Api.Contracts.ListPermissionRequest" as const;
