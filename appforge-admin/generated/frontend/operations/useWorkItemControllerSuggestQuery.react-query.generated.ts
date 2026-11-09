// ------------------------------------------------------------------------------
// GENERATED FILE - source: workitems/endpoints.json
// DO NOT EDIT MANUALLY.
// ------------------------------------------------------------------------------

import { useGeneratedQuery } from "../runtime/reactQueryRuntime";
import type { GeneratedEndpointInput, GeneratedQueryOptions } from "../runtime/reactQueryTypes";
import { workItemControllerSuggestQuery } from "./workItemControllerSuggestQuery.query.generated";
import type { SuggestWorkItemRequest } from "../workitems/types/SuggestWorkItemRequest.generated";
import type { WorkItemSuggestionDto } from "../workitems/types/WorkItemSuggestionDto.generated";

export function useWorkItemControllerSuggestQuery(
  input: GeneratedEndpointInput<{ field: string; request: SuggestWorkItemRequest; }>,
  options?: GeneratedQueryOptions<WorkItemSuggestionDto[]>,
  _config?: unknown,
) {
  return useGeneratedQuery(workItemControllerSuggestQuery, input, options);
}
