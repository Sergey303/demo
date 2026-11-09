// ------------------------------------------------------------------------------
// GENERATED FILE - source: servicerequests/types.json
// DO NOT EDIT MANUALLY.
// ------------------------------------------------------------------------------

import type { ServiceRequestDto } from "./ServiceRequestDto.generated";

export interface ListServiceRequestResult {
  "items": ServiceRequestDto[];
  "page": number;
  "pageSize": number;
  "totalCount": number;
}
export const ListServiceRequestResultTypeKey = "Demo.BusinessOperations.Api.Contracts.ListServiceRequestResult" as const;
