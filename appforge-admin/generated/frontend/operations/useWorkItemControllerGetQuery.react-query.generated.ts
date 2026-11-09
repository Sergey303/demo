// ------------------------------------------------------------------------------
// GENERATED FILE - source: workitems/endpoints.json
// DO NOT EDIT MANUALLY.
// ------------------------------------------------------------------------------

import { useGeneratedQuery } from "../runtime/reactQueryRuntime";
import type { GeneratedEndpointInput, GeneratedQueryOptions } from "../runtime/reactQueryTypes";
import { workItemControllerGetQuery } from "./workItemControllerGetQuery.query.generated";
import type { WorkItemDto } from "../workitems/types/WorkItemDto.generated";

export function useWorkItemControllerGetQuery(
  input: GeneratedEndpointInput<{ id: string; }>,
  options?: GeneratedQueryOptions<WorkItemDto>,
  _config?: unknown,
) {
  return useGeneratedQuery(workItemControllerGetQuery, input, options);
}
