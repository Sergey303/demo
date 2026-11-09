// ------------------------------------------------------------------------------
// GENERATED FILE - source: workitems/endpoints.json
// DO NOT EDIT MANUALLY.
// ------------------------------------------------------------------------------

import { useGeneratedMutation } from "../runtime/reactQueryRuntime";
import type { GeneratedMutationOptions } from "../runtime/reactQueryTypes";
import { workItemControllerUpdateMutation } from "./workItemControllerUpdateMutation.mutation.generated";
import type { UpdateWorkItemRequest } from "../workitems/types/UpdateWorkItemRequest.generated";
import type { WorkItemDto } from "../workitems/types/WorkItemDto.generated";

export function useWorkItemControllerUpdateMutation(
  options?: GeneratedMutationOptions<{ id: string; body: UpdateWorkItemRequest; }, WorkItemDto>,
  _config?: unknown,
) {
  return useGeneratedMutation(workItemControllerUpdateMutation, options);
}
