// ------------------------------------------------------------------------------
// GENERATED FILE - source: leadstatuses/endpoints.json
// DO NOT EDIT MANUALLY.
// ------------------------------------------------------------------------------

import { useGeneratedMutation } from "../runtime/reactQueryRuntime";
import type { GeneratedMutationOptions } from "../runtime/reactQueryTypes";
import { leadStatusControllerUpdateMutation } from "./leadStatusControllerUpdateMutation.mutation.generated";
import type { LeadStatusDto } from "../leadstatuses/types/LeadStatusDto.generated";
import type { UpdateLeadStatusRequest } from "../leadstatuses/types/UpdateLeadStatusRequest.generated";

export function useLeadStatusControllerUpdateMutation(
  options?: GeneratedMutationOptions<{ id: string; body: UpdateLeadStatusRequest; }, LeadStatusDto>,
  _config?: unknown,
) {
  return useGeneratedMutation(leadStatusControllerUpdateMutation, options);
}
