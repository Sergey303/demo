// ------------------------------------------------------------------------------
// GENERATED FILE - source: servicerequests/endpoints.json
// DO NOT EDIT MANUALLY.
// ------------------------------------------------------------------------------

import { useGeneratedMutation } from "../runtime/reactQueryRuntime";
import type { GeneratedMutationOptions } from "../runtime/reactQueryTypes";
import { serviceRequestControllerCreateMutation } from "./serviceRequestControllerCreateMutation.mutation.generated";
import type { CreateServiceRequestRequest } from "../servicerequests/types/CreateServiceRequestRequest.generated";
import type { ServiceRequestDto } from "../servicerequests/types/ServiceRequestDto.generated";

export function useServiceRequestControllerCreateMutation(
  options?: GeneratedMutationOptions<CreateServiceRequestRequest, ServiceRequestDto>,
  _config?: unknown,
) {
  return useGeneratedMutation(serviceRequestControllerCreateMutation, options);
}
