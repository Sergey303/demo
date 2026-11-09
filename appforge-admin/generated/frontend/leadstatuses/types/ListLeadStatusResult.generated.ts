// ------------------------------------------------------------------------------
// GENERATED FILE - source: leadstatuses/types.json
// DO NOT EDIT MANUALLY.
// ------------------------------------------------------------------------------

import type { LeadStatusDto } from "./LeadStatusDto.generated";

export interface ListLeadStatusResult {
  "items": LeadStatusDto[];
  "page": number;
  "pageSize": number;
  "totalCount": number;
}
export const ListLeadStatusResultTypeKey = "Demo.TelegramOperations.Api.Contracts.ListLeadStatusResult" as const;
