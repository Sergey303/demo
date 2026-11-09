// ------------------------------------------------------------------------------
// GENERATED FILE - source: leadstatuses/endpoints.json
// DO NOT EDIT MANUALLY.
// ------------------------------------------------------------------------------

import { useGeneratedQuery } from "../runtime/reactQueryRuntime";
import type { GeneratedEndpointInput, GeneratedQueryOptions } from "../runtime/reactQueryTypes";
import { leadStatusControllerSuggestQuery } from "./leadStatusControllerSuggestQuery.query.generated";
import type { LeadStatusSuggestionDto } from "../leadstatuses/types/LeadStatusSuggestionDto.generated";
import type { SuggestLeadStatusRequest } from "../leadstatuses/types/SuggestLeadStatusRequest.generated";

export function useLeadStatusControllerSuggestQuery(
  input: GeneratedEndpointInput<{ field: string; request: SuggestLeadStatusRequest; }>,
  options?: GeneratedQueryOptions<LeadStatusSuggestionDto[]>,
  _config?: unknown,
) {
  return useGeneratedQuery(leadStatusControllerSuggestQuery, input, options);
}
