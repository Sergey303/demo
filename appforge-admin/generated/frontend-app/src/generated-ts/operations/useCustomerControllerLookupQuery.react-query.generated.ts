// ------------------------------------------------------------------------------
// GENERATED FILE - source: customers/endpoints.json
// DO NOT EDIT MANUALLY.
// ------------------------------------------------------------------------------

import { useGeneratedQuery } from "../runtime/reactQueryRuntime";
import type { GeneratedEndpointInput, GeneratedQueryOptions } from "../runtime/reactQueryTypes";
import { customerControllerLookupQuery } from "./customerControllerLookupQuery.query.generated";
import type { CustomerLookupDto } from "../customers/types/CustomerLookupDto.generated";
import type { LookupCustomerRequest } from "../customers/types/LookupCustomerRequest.generated";

export function useCustomerControllerLookupQuery(
  input: GeneratedEndpointInput<{ request: LookupCustomerRequest; }>,
  options?: GeneratedQueryOptions<CustomerLookupDto[]>,
  _config?: unknown,
) {
  return useGeneratedQuery(customerControllerLookupQuery, input, options);
}
