// ------------------------------------------------------------------------------
// GENERATED FILE - source: customers/endpoints.json
// DO NOT EDIT MANUALLY.
// ------------------------------------------------------------------------------

import { useGeneratedQuery } from "../runtime/reactQueryRuntime";
import type { GeneratedEndpointInput, GeneratedQueryOptions } from "../runtime/reactQueryTypes";
import { customerControllerOptionsQuery } from "./customerControllerOptionsQuery.query.generated";
import type { CustomerOptionDto } from "../customers/types/CustomerOptionDto.generated";

export function useCustomerControllerOptionsQuery(
  input: GeneratedEndpointInput<{ field: string; }>,
  options?: GeneratedQueryOptions<CustomerOptionDto[]>,
  _config?: unknown,
) {
  return useGeneratedQuery(customerControllerOptionsQuery, input, options);
}
