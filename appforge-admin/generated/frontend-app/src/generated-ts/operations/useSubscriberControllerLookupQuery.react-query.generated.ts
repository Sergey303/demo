// ------------------------------------------------------------------------------
// GENERATED FILE - source: subscribers/endpoints.json
// DO NOT EDIT MANUALLY.
// ------------------------------------------------------------------------------

import { useGeneratedQuery } from "../runtime/reactQueryRuntime";
import type { GeneratedEndpointInput, GeneratedQueryOptions } from "../runtime/reactQueryTypes";
import { subscriberControllerLookupQuery } from "./subscriberControllerLookupQuery.query.generated";
import type { LookupSubscriberRequest } from "../subscribers/types/LookupSubscriberRequest.generated";
import type { SubscriberLookupDto } from "../subscribers/types/SubscriberLookupDto.generated";

export function useSubscriberControllerLookupQuery(
  input: GeneratedEndpointInput<{ request: LookupSubscriberRequest; }>,
  options?: GeneratedQueryOptions<SubscriberLookupDto[]>,
  _config?: unknown,
) {
  return useGeneratedQuery(subscriberControllerLookupQuery, input, options);
}
