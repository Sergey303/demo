// ------------------------------------------------------------------------------
// GENERATED FILE - source: subscriberstatuses/endpoints.json
// DO NOT EDIT MANUALLY.
// ------------------------------------------------------------------------------

import { useGeneratedQuery } from "../runtime/reactQueryRuntime";
import type { GeneratedEndpointInput, GeneratedQueryOptions } from "../runtime/reactQueryTypes";
import { subscriberStatusControllerOptionsQuery } from "./subscriberStatusControllerOptionsQuery.query.generated";
import type { SubscriberStatusOptionDto } from "../subscriberstatuses/types/SubscriberStatusOptionDto.generated";

export function useSubscriberStatusControllerOptionsQuery(
  input: GeneratedEndpointInput<{ field: string; }>,
  options?: GeneratedQueryOptions<SubscriberStatusOptionDto[]>,
  _config?: unknown,
) {
  return useGeneratedQuery(subscriberStatusControllerOptionsQuery, input, options);
}
