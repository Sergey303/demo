// ------------------------------------------------------------------------------
// GENERATED FILE - source: leadstatuses/types.json
// DO NOT EDIT MANUALLY.
// ------------------------------------------------------------------------------

import type { ListLeadStatusFilter } from "./ListLeadStatusFilter.generated";
import type { ListLeadStatusSort } from "./ListLeadStatusSort.generated";

export interface ListLeadStatusRequest {
  "filters": ListLeadStatusFilter[];
  "page": number;
  "pageSize": number;
  "sort": ListLeadStatusSort[];
}
export const ListLeadStatusRequestTypeKey = "Demo.TelegramOperations.Api.Contracts.ListLeadStatusRequest" as const;
