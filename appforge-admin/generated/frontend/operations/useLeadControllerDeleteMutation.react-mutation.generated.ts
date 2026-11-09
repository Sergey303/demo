// ------------------------------------------------------------------------------
// GENERATED FILE - source: leads/endpoints.json
// DO NOT EDIT MANUALLY.
// ------------------------------------------------------------------------------

import { useGeneratedMutation } from "../runtime/reactQueryRuntime";
import type { GeneratedMutationOptions } from "../runtime/reactQueryTypes";
import { leadControllerDeleteMutation } from "./leadControllerDeleteMutation.mutation.generated";

export function useLeadControllerDeleteMutation(
  options?: GeneratedMutationOptions<{ id: string; }, void>,
  _config?: unknown,
) {
  return useGeneratedMutation(leadControllerDeleteMutation, options);
}
