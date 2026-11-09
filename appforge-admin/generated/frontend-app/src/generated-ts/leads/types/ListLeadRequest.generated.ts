// ------------------------------------------------------------------------------
// GENERATED FILE - source: leads/types.json
// DO NOT EDIT MANUALLY.
// ------------------------------------------------------------------------------

import type { ListLeadFilter } from "./ListLeadFilter.generated";
import type { ListLeadSort } from "./ListLeadSort.generated";

export interface ListLeadRequest {
  "filters": ListLeadFilter[];
  "page": number;
  "pageSize": number;
  "sort": ListLeadSort[];
}
export const ListLeadRequestTypeKey = "Demo.TelegramOperations.Api.Contracts.ListLeadRequest" as const;
