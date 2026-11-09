// ------------------------------------------------------------------------------
// GENERATED FILE - source: customers/endpoints.json
// DO NOT EDIT MANUALLY.
// ------------------------------------------------------------------------------

import { useGeneratedQuery } from "../runtime/reactQueryRuntime";
import type { GeneratedEndpointInput, GeneratedQueryOptions } from "../runtime/reactQueryTypes";
import { customerControllerListQuery } from "./customerControllerListQuery.query.generated";
import type { ListCustomerRequest } from "../customers/types/ListCustomerRequest.generated";
import type { ListCustomerResult } from "../customers/types/ListCustomerResult.generated";

export function useCustomerControllerListQuery(
  input: GeneratedEndpointInput<{ request: ListCustomerRequest; }>,
  options?: GeneratedQueryOptions<ListCustomerResult>,
  _config?: unknown,
) {
  return useGeneratedQuery(customerControllerListQuery, input, options);
}
