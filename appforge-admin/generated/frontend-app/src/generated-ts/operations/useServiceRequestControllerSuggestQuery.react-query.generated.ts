// ------------------------------------------------------------------------------
// GENERATED FILE - source: servicerequests/endpoints.json
// DO NOT EDIT MANUALLY.
// ------------------------------------------------------------------------------

import { useGeneratedQuery } from "../runtime/reactQueryRuntime";
import type { GeneratedEndpointInput, GeneratedQueryOptions } from "../runtime/reactQueryTypes";
import { serviceRequestControllerSuggestQuery } from "./serviceRequestControllerSuggestQuery.query.generated";
import type { ServiceRequestSuggestionDto } from "../servicerequests/types/ServiceRequestSuggestionDto.generated";
import type { SuggestServiceRequestRequest } from "../servicerequests/types/SuggestServiceRequestRequest.generated";

export function useServiceRequestControllerSuggestQuery(
  input: GeneratedEndpointInput<{ field: string; request: SuggestServiceRequestRequest; }>,
  options?: GeneratedQueryOptions<ServiceRequestSuggestionDto[]>,
  _config?: unknown,
) {
  return useGeneratedQuery(serviceRequestControllerSuggestQuery, input, options);
}
