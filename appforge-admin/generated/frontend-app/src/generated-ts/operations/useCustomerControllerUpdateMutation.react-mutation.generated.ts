// ------------------------------------------------------------------------------
// GENERATED FILE - source: customers/endpoints.json
// DO NOT EDIT MANUALLY.
// ------------------------------------------------------------------------------

import { useGeneratedMutation } from "../runtime/reactQueryRuntime";
import type { GeneratedMutationOptions } from "../runtime/reactQueryTypes";
import { customerControllerUpdateMutation } from "./customerControllerUpdateMutation.mutation.generated";
import type { CustomerDto } from "../customers/types/CustomerDto.generated";
import type { UpdateCustomerRequest } from "../customers/types/UpdateCustomerRequest.generated";

export function useCustomerControllerUpdateMutation(
  options?: GeneratedMutationOptions<{ id: string; body: UpdateCustomerRequest; }, CustomerDto>,
  _config?: unknown,
) {
  return useGeneratedMutation(customerControllerUpdateMutation, options);
}
