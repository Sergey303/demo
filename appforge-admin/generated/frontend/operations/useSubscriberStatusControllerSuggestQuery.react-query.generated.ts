// ------------------------------------------------------------------------------
// GENERATED FILE - source: subscriberstatuses/endpoints.json
// DO NOT EDIT MANUALLY.
// ------------------------------------------------------------------------------

import { useGeneratedQuery } from "../runtime/reactQueryRuntime";
import type { GeneratedEndpointInput, GeneratedQueryOptions } from "../runtime/reactQueryTypes";
import { subscriberStatusControllerSuggestQuery } from "./subscriberStatusControllerSuggestQuery.query.generated";
import type { SubscriberStatusSuggestionDto } from "../subscriberstatuses/types/SubscriberStatusSuggestionDto.generated";
import type { SuggestSubscriberStatusRequest } from "../subscriberstatuses/types/SuggestSubscriberStatusRequest.generated";

export function useSubscriberStatusControllerSuggestQuery(
  input: GeneratedEndpointInput<{ field: string; request: SuggestSubscriberStatusRequest; }>,
  options?: GeneratedQueryOptions<SubscriberStatusSuggestionDto[]>,
  _config?: unknown,
) {
  return useGeneratedQuery(subscriberStatusControllerSuggestQuery, input, options);
}
