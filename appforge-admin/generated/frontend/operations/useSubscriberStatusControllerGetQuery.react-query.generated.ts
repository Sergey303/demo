// ------------------------------------------------------------------------------
// GENERATED FILE - source: subscriberstatuses/endpoints.json
// DO NOT EDIT MANUALLY.
// ------------------------------------------------------------------------------

import { useGeneratedQuery } from "../runtime/reactQueryRuntime";
import type { GeneratedEndpointInput, GeneratedQueryOptions } from "../runtime/reactQueryTypes";
import { subscriberStatusControllerGetQuery } from "./subscriberStatusControllerGetQuery.query.generated";
import type { SubscriberStatusDto } from "../subscriberstatuses/types/SubscriberStatusDto.generated";

export function useSubscriberStatusControllerGetQuery(
  input: GeneratedEndpointInput<{ id: string; }>,
  options?: GeneratedQueryOptions<SubscriberStatusDto>,
  _config?: unknown,
) {
  return useGeneratedQuery(subscriberStatusControllerGetQuery, input, options);
}
