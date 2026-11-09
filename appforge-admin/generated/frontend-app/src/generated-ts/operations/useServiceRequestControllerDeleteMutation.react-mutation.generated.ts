// ------------------------------------------------------------------------------
// GENERATED FILE - source: servicerequests/endpoints.json
// DO NOT EDIT MANUALLY.
// ------------------------------------------------------------------------------

import { useGeneratedMutation } from "../runtime/reactQueryRuntime";
import type { GeneratedMutationOptions } from "../runtime/reactQueryTypes";
import { serviceRequestControllerDeleteMutation } from "./serviceRequestControllerDeleteMutation.mutation.generated";

export function useServiceRequestControllerDeleteMutation(
  options?: GeneratedMutationOptions<{ id: string; }, void>,
  _config?: unknown,
) {
  return useGeneratedMutation(serviceRequestControllerDeleteMutation, options);
}
