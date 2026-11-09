// ------------------------------------------------------------------------------
// GENERATED FILE - source: servicerequests/endpoints.json
// DO NOT EDIT MANUALLY.
// ------------------------------------------------------------------------------

import { useGeneratedQuery } from "../runtime/reactQueryRuntime";
import type { GeneratedEndpointInput, GeneratedQueryOptions } from "../runtime/reactQueryTypes";
import { serviceRequestControllerLookupQuery } from "./serviceRequestControllerLookupQuery.query.generated";
import type { LookupServiceRequestRequest } from "../servicerequests/types/LookupServiceRequestRequest.generated";
import type { ServiceRequestLookupDto } from "../servicerequests/types/ServiceRequestLookupDto.generated";

export function useServiceRequestControllerLookupQuery(
  input: GeneratedEndpointInput<{ request: LookupServiceRequestRequest; }>,
  options?: GeneratedQueryOptions<ServiceRequestLookupDto[]>,
  _config?: unknown,
) {
  return useGeneratedQuery(serviceRequestControllerLookupQuery, input, options);
}
