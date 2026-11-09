// ------------------------------------------------------------------------------
// GENERATED FILE - source: leadstatuses/endpoints.json
// DO NOT EDIT MANUALLY.
// ------------------------------------------------------------------------------

import { useGeneratedMutation } from "../runtime/reactQueryRuntime";
import type { GeneratedMutationOptions } from "../runtime/reactQueryTypes";
import { leadStatusControllerCreateMutation } from "./leadStatusControllerCreateMutation.mutation.generated";
import type { CreateLeadStatusRequest } from "../leadstatuses/types/CreateLeadStatusRequest.generated";
import type { LeadStatusDto } from "../leadstatuses/types/LeadStatusDto.generated";

export function useLeadStatusControllerCreateMutation(
  options?: GeneratedMutationOptions<CreateLeadStatusRequest, LeadStatusDto>,
  _config?: unknown,
) {
  return useGeneratedMutation(leadStatusControllerCreateMutation, options);
}
