// ------------------------------------------------------------------------------
// GENERATED FILE - source: customers/endpoints.json
// DO NOT EDIT MANUALLY.
// ------------------------------------------------------------------------------

import { useGeneratedQuery } from "../runtime/reactQueryRuntime";
import type { GeneratedEndpointInput, GeneratedQueryOptions } from "../runtime/reactQueryTypes";
import { customerControllerGetQuery } from "./customerControllerGetQuery.query.generated";
import type { CustomerDto } from "../customers/types/CustomerDto.generated";

export function useCustomerControllerGetQuery(
  input: GeneratedEndpointInput<{ id: string; }>,
  options?: GeneratedQueryOptions<CustomerDto>,
  _config?: unknown,
) {
  return useGeneratedQuery(customerControllerGetQuery, input, options);
}
