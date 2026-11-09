// ------------------------------------------------------------------------------
// GENERATED FILE - source: servicerequests/endpoints.json
// DO NOT EDIT MANUALLY.
// ------------------------------------------------------------------------------

import { useGeneratedQuery } from "../runtime/reactQueryRuntime";
import type { GeneratedEndpointInput, GeneratedQueryOptions } from "../runtime/reactQueryTypes";
import { serviceRequestControllerGetQuery } from "./serviceRequestControllerGetQuery.query.generated";
import type { ServiceRequestDto } from "../servicerequests/types/ServiceRequestDto.generated";

export function useServiceRequestControllerGetQuery(
  input: GeneratedEndpointInput<{ id: string; }>,
  options?: GeneratedQueryOptions<ServiceRequestDto>,
  _config?: unknown,
) {
  return useGeneratedQuery(serviceRequestControllerGetQuery, input, options);
}
