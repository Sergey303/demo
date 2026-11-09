// ------------------------------------------------------------------------------
// GENERATED FILE - source: customers/types.json
// DO NOT EDIT MANUALLY.
// ------------------------------------------------------------------------------

import type { CustomerDto } from "./CustomerDto.generated";

export interface ListCustomerResult {
  "items": CustomerDto[];
  "page": number;
  "pageSize": number;
  "totalCount": number;
}
export const ListCustomerResultTypeKey = "Demo.BusinessOperations.Api.Contracts.ListCustomerResult" as const;
