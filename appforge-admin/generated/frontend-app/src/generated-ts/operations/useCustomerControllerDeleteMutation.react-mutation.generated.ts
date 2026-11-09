// ------------------------------------------------------------------------------
// GENERATED FILE - source: customers/endpoints.json
// DO NOT EDIT MANUALLY.
// ------------------------------------------------------------------------------

import { useGeneratedMutation } from "../runtime/reactQueryRuntime";
import type { GeneratedMutationOptions } from "../runtime/reactQueryTypes";
import { customerControllerDeleteMutation } from "./customerControllerDeleteMutation.mutation.generated";

export function useCustomerControllerDeleteMutation(
  options?: GeneratedMutationOptions<{ id: string; }, void>,
  _config?: unknown,
) {
  return useGeneratedMutation(customerControllerDeleteMutation, options);
}
