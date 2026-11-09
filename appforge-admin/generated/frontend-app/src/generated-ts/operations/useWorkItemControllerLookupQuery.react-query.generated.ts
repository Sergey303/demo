// ------------------------------------------------------------------------------
// GENERATED FILE - source: workitems/endpoints.json
// DO NOT EDIT MANUALLY.
// ------------------------------------------------------------------------------

import { useGeneratedQuery } from "../runtime/reactQueryRuntime";
import type { GeneratedEndpointInput, GeneratedQueryOptions } from "../runtime/reactQueryTypes";
import { workItemControllerLookupQuery } from "./workItemControllerLookupQuery.query.generated";
import type { LookupWorkItemRequest } from "../workitems/types/LookupWorkItemRequest.generated";
import type { WorkItemLookupDto } from "../workitems/types/WorkItemLookupDto.generated";

export function useWorkItemControllerLookupQuery(
  input: GeneratedEndpointInput<{ request: LookupWorkItemRequest; }>,
  options?: GeneratedQueryOptions<WorkItemLookupDto[]>,
  _config?: unknown,
) {
  return useGeneratedQuery(workItemControllerLookupQuery, input, options);
}
