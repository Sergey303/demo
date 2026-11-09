// ------------------------------------------------------------------------------
// GENERATED FILE - source: servicerequests/endpoints.json
// DO NOT EDIT MANUALLY.
// ------------------------------------------------------------------------------

import { useGeneratedQuery } from "../runtime/reactQueryRuntime";
import type { GeneratedEndpointInput, GeneratedQueryOptions } from "../runtime/reactQueryTypes";
import { serviceRequestControllerListQuery } from "./serviceRequestControllerListQuery.query.generated";
import type { ListServiceRequestRequest } from "../servicerequests/types/ListServiceRequestRequest.generated";
import type { ListServiceRequestResult } from "../servicerequests/types/ListServiceRequestResult.generated";

export function useServiceRequestControllerListQuery(
  input: GeneratedEndpointInput<{ request: ListServiceRequestRequest; }>,
  options?: GeneratedQueryOptions<ListServiceRequestResult>,
  _config?: unknown,
) {
  return useGeneratedQuery(serviceRequestControllerListQuery, input, options);
}
