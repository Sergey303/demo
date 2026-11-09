// ------------------------------------------------------------------------------
// GENERATED FILE - source: leads/types.json
// DO NOT EDIT MANUALLY.
// ------------------------------------------------------------------------------

import type { LeadDto } from "./LeadDto.generated";

export interface ListLeadResult {
  "items": LeadDto[];
  "page": number;
  "pageSize": number;
  "totalCount": number;
}
export const ListLeadResultTypeKey = "Demo.TelegramOperations.Api.Contracts.ListLeadResult" as const;
