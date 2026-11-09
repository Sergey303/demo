// ------------------------------------------------------------------------------
// GENERATED FILE - source: workitems/endpoints.json
// DO NOT EDIT MANUALLY.
// ------------------------------------------------------------------------------

import { useGeneratedMutation } from "../runtime/reactQueryRuntime";
import type { GeneratedMutationOptions } from "../runtime/reactQueryTypes";
import { workItemControllerDeleteMutation } from "./workItemControllerDeleteMutation.mutation.generated";

export function useWorkItemControllerDeleteMutation(
  options?: GeneratedMutationOptions<{ id: string; }, void>,
  _config?: unknown,
) {
  return useGeneratedMutation(workItemControllerDeleteMutation, options);
}
