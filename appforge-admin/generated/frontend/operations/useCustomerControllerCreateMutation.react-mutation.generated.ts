// ------------------------------------------------------------------------------
// GENERATED FILE - source: customers/endpoints.json
// DO NOT EDIT MANUALLY.
// ------------------------------------------------------------------------------

import { useGeneratedMutation } from "../runtime/reactQueryRuntime";
import type { GeneratedMutationOptions } from "../runtime/reactQueryTypes";
import { customerControllerCreateMutation } from "./customerControllerCreateMutation.mutation.generated";
import type { CreateCustomerRequest } from "../customers/types/CreateCustomerRequest.generated";
import type { CustomerDto } from "../customers/types/CustomerDto.generated";

export function useCustomerControllerCreateMutation(
  options?: GeneratedMutationOptions<CreateCustomerRequest, CustomerDto>,
  _config?: unknown,
) {
  return useGeneratedMutation(customerControllerCreateMutation, options);
}
