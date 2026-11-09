// ------------------------------------------------------------------------------
// GENERATED FILE - source: subscribers/endpoints.json
// DO NOT EDIT MANUALLY.
// ------------------------------------------------------------------------------

import { useGeneratedQuery } from "../runtime/reactQueryRuntime";
import type { GeneratedEndpointInput, GeneratedQueryOptions } from "../runtime/reactQueryTypes";
import { subscriberControllerSuggestQuery } from "./subscriberControllerSuggestQuery.query.generated";
import type { SubscriberSuggestionDto } from "../subscribers/types/SubscriberSuggestionDto.generated";
import type { SuggestSubscriberRequest } from "../subscribers/types/SuggestSubscriberRequest.generated";

export function useSubscriberControllerSuggestQuery(
  input: GeneratedEndpointInput<{ field: string; request: SuggestSubscriberRequest; }>,
  options?: GeneratedQueryOptions<SubscriberSuggestionDto[]>,
  _config?: unknown,
) {
  return useGeneratedQuery(subscriberControllerSuggestQuery, input, options);
}
