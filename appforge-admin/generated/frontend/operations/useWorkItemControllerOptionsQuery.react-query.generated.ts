// ------------------------------------------------------------------------------
// GENERATED FILE - source: workitems/endpoints.json
// DO NOT EDIT MANUALLY.
// ------------------------------------------------------------------------------

import { useGeneratedQuery } from "../runtime/reactQueryRuntime";
import type { GeneratedEndpointInput, GeneratedQueryOptions } from "../runtime/reactQueryTypes";
import { workItemControllerOptionsQuery } from "./workItemControllerOptionsQuery.query.generated";
import type { WorkItemOptionDto } from "../workitems/types/WorkItemOptionDto.generated";

export function useWorkItemControllerOptionsQuery(
  input: GeneratedEndpointInput<{ field: string; }>,
  options?: GeneratedQueryOptions<WorkItemOptionDto[]>,
  _config?: unknown,
) {
  return useGeneratedQuery(workItemControllerOptionsQuery, input, options);
}
