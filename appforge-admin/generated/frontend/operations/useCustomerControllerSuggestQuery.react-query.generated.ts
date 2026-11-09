// ------------------------------------------------------------------------------
// GENERATED FILE - source: customers/endpoints.json
// DO NOT EDIT MANUALLY.
// ------------------------------------------------------------------------------

import { useGeneratedQuery } from "../runtime/reactQueryRuntime";
import type { GeneratedEndpointInput, GeneratedQueryOptions } from "../runtime/reactQueryTypes";
import { customerControllerSuggestQuery } from "./customerControllerSuggestQuery.query.generated";
import type { CustomerSuggestionDto } from "../customers/types/CustomerSuggestionDto.generated";
import type { SuggestCustomerRequest } from "../customers/types/SuggestCustomerRequest.generated";

export function useCustomerControllerSuggestQuery(
  input: GeneratedEndpointInput<{ field: string; request: SuggestCustomerRequest; }>,
  options?: GeneratedQueryOptions<CustomerSuggestionDto[]>,
  _config?: unknown,
) {
  return useGeneratedQuery(customerControllerSuggestQuery, input, options);
}
