// ------------------------------------------------------------------------------
// GENERATED FILE - source: subscriberstatuses/endpoints.json
// DO NOT EDIT MANUALLY.
// ------------------------------------------------------------------------------

import { useGeneratedQuery } from "../runtime/reactQueryRuntime";
import type { GeneratedEndpointInput, GeneratedQueryOptions } from "../runtime/reactQueryTypes";
import { subscriberStatusControllerLookupQuery } from "./subscriberStatusControllerLookupQuery.query.generated";
import type { LookupSubscriberStatusRequest } from "../subscriberstatuses/types/LookupSubscriberStatusRequest.generated";
import type { SubscriberStatusLookupDto } from "../subscriberstatuses/types/SubscriberStatusLookupDto.generated";

export function useSubscriberStatusControllerLookupQuery(
  input: GeneratedEndpointInput<{ request: LookupSubscriberStatusRequest; }>,
  options?: GeneratedQueryOptions<SubscriberStatusLookupDto[]>,
  _config?: unknown,
) {
  return useGeneratedQuery(subscriberStatusControllerLookupQuery, input, options);
}
