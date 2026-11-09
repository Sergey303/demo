// ------------------------------------------------------------------------------
// GENERATED FILE - source: workitems/endpoints.json
// DO NOT EDIT MANUALLY.
// ------------------------------------------------------------------------------

import { useGeneratedQuery } from "../runtime/reactQueryRuntime";
import type { GeneratedEndpointInput, GeneratedQueryOptions } from "../runtime/reactQueryTypes";
import { workItemControllerListQuery } from "./workItemControllerListQuery.query.generated";
import type { ListWorkItemRequest } from "../workitems/types/ListWorkItemRequest.generated";
import type { ListWorkItemResult } from "../workitems/types/ListWorkItemResult.generated";

export function useWorkItemControllerListQuery(
  input: GeneratedEndpointInput<{ request: ListWorkItemRequest; }>,
  options?: GeneratedQueryOptions<ListWorkItemResult>,
  _config?: unknown,
) {
  return useGeneratedQuery(workItemControllerListQuery, input, options);
}
