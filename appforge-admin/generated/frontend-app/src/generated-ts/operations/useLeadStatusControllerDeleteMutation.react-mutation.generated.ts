// ------------------------------------------------------------------------------
// GENERATED FILE - source: leadstatuses/endpoints.json
// DO NOT EDIT MANUALLY.
// ------------------------------------------------------------------------------

import { useGeneratedMutation } from "../runtime/reactQueryRuntime";
import type { GeneratedMutationOptions } from "../runtime/reactQueryTypes";
import { leadStatusControllerDeleteMutation } from "./leadStatusControllerDeleteMutation.mutation.generated";

export function useLeadStatusControllerDeleteMutation(
  options?: GeneratedMutationOptions<{ id: string; }, void>,
  _config?: unknown,
) {
  return useGeneratedMutation(leadStatusControllerDeleteMutation, options);
}
