// ------------------------------------------------------------------------------
// GENERATED FILE - source: leads/endpoints.json
// DO NOT EDIT MANUALLY.
// ------------------------------------------------------------------------------

import { useGeneratedMutation } from "../runtime/reactQueryRuntime";
import type { GeneratedMutationOptions } from "../runtime/reactQueryTypes";
import { leadControllerUpdateMutation } from "./leadControllerUpdateMutation.mutation.generated";
import type { LeadDto } from "../leads/types/LeadDto.generated";
import type { UpdateLeadRequest } from "../leads/types/UpdateLeadRequest.generated";

export function useLeadControllerUpdateMutation(
  options?: GeneratedMutationOptions<{ id: string; body: UpdateLeadRequest; }, LeadDto>,
  _config?: unknown,
) {
  return useGeneratedMutation(leadControllerUpdateMutation, options);
}
