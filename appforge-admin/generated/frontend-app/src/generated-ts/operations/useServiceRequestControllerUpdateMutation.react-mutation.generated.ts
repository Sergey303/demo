// ------------------------------------------------------------------------------
// GENERATED FILE - source: servicerequests/endpoints.json
// DO NOT EDIT MANUALLY.
// ------------------------------------------------------------------------------

import { useGeneratedMutation } from "../runtime/reactQueryRuntime";
import type { GeneratedMutationOptions } from "../runtime/reactQueryTypes";
import { serviceRequestControllerUpdateMutation } from "./serviceRequestControllerUpdateMutation.mutation.generated";
import type { ServiceRequestDto } from "../servicerequests/types/ServiceRequestDto.generated";
import type { UpdateServiceRequestRequest } from "../servicerequests/types/UpdateServiceRequestRequest.generated";

export function useServiceRequestControllerUpdateMutation(
  options?: GeneratedMutationOptions<{ id: string; body: UpdateServiceRequestRequest; }, ServiceRequestDto>,
  _config?: unknown,
) {
  return useGeneratedMutation(serviceRequestControllerUpdateMutation, options);
}
