// ------------------------------------------------------------------------------
// GENERATED FILE - source: customers/types.json
// DO NOT EDIT MANUALLY.
// ------------------------------------------------------------------------------

import type { ListCustomerFilter } from "./ListCustomerFilter.generated";
import type { ListCustomerSort } from "./ListCustomerSort.generated";

export interface ListCustomerRequest {
  "filters": ListCustomerFilter[];
  "page": number;
  "pageSize": number;
  "sort": ListCustomerSort[];
}
export const ListCustomerRequestTypeKey = "Demo.BusinessOperations.Api.Contracts.ListCustomerRequest" as const;
