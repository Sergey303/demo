// ------------------------------------------------------------------------------
// GENERATED FILE - source: servicerequests/endpoints.json
// DO NOT EDIT MANUALLY.
// ------------------------------------------------------------------------------

import { useGeneratedQuery } from "../runtime/reactQueryRuntime";
import type { GeneratedEndpointInput, GeneratedQueryOptions } from "../runtime/reactQueryTypes";
import { serviceRequestControllerOptionsQuery } from "./serviceRequestControllerOptionsQuery.query.generated";
import type { ServiceRequestOptionDto } from "../servicerequests/types/ServiceRequestOptionDto.generated";

export function useServiceRequestControllerOptionsQuery(
  input: GeneratedEndpointInput<{ field: string; }>,
  options?: GeneratedQueryOptions<ServiceRequestOptionDto[]>,
  _config?: unknown,
) {
  return useGeneratedQuery(serviceRequestControllerOptionsQuery, input, options);
}
