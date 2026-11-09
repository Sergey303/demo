// ------------------------------------------------------------------------------
// GENERATED FILE - source: leads/endpoints.json
// DO NOT EDIT MANUALLY.
// ------------------------------------------------------------------------------

import { useGeneratedQuery } from "../runtime/reactQueryRuntime";
import type { GeneratedEndpointInput, GeneratedQueryOptions } from "../runtime/reactQueryTypes";
import { leadControllerSuggestQuery } from "./leadControllerSuggestQuery.query.generated";
import type { LeadSuggestionDto } from "../leads/types/LeadSuggestionDto.generated";
import type { SuggestLeadRequest } from "../leads/types/SuggestLeadRequest.generated";

export function useLeadControllerSuggestQuery(
  input: GeneratedEndpointInput<{ field: string; request: SuggestLeadRequest; }>,
  options?: GeneratedQueryOptions<LeadSuggestionDto[]>,
  _config?: unknown,
) {
  return useGeneratedQuery(leadControllerSuggestQuery, input, options);
}
