// ------------------------------------------------------------------------------
// GENERATED FILE - source: leads/endpoints.json
// DO NOT EDIT MANUALLY.
// ------------------------------------------------------------------------------

import { useGeneratedMutation } from "../runtime/reactQueryRuntime";
import type { GeneratedMutationOptions } from "../runtime/reactQueryTypes";
import { leadControllerCreateMutation } from "./leadControllerCreateMutation.mutation.generated";
import type { CreateLeadRequest } from "../leads/types/CreateLeadRequest.generated";
import type { LeadDto } from "../leads/types/LeadDto.generated";

export function useLeadControllerCreateMutation(
  options?: GeneratedMutationOptions<CreateLeadRequest, LeadDto>,
  _config?: unknown,
) {
  return useGeneratedMutation(leadControllerCreateMutation, options);
}
