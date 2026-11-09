// ------------------------------------------------------------------------------
// GENERATED FILE - source: workitems/endpoints.json
// DO NOT EDIT MANUALLY.
// ------------------------------------------------------------------------------

import { useGeneratedMutation } from "../runtime/reactQueryRuntime";
import type { GeneratedMutationOptions } from "../runtime/reactQueryTypes";
import { workItemControllerCreateMutation } from "./workItemControllerCreateMutation.mutation.generated";
import type { CreateWorkItemRequest } from "../workitems/types/CreateWorkItemRequest.generated";
import type { WorkItemDto } from "../workitems/types/WorkItemDto.generated";

export function useWorkItemControllerCreateMutation(
  options?: GeneratedMutationOptions<CreateWorkItemRequest, WorkItemDto>,
  _config?: unknown,
) {
  return useGeneratedMutation(workItemControllerCreateMutation, options);
}
