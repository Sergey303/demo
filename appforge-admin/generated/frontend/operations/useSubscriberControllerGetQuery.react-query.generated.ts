// ------------------------------------------------------------------------------
// GENERATED FILE - source: subscribers/endpoints.json
// DO NOT EDIT MANUALLY.
// ------------------------------------------------------------------------------

import { useGeneratedQuery } from "../runtime/reactQueryRuntime";
import type { GeneratedEndpointInput, GeneratedQueryOptions } from "../runtime/reactQueryTypes";
import { subscriberControllerGetQuery } from "./subscriberControllerGetQuery.query.generated";
import type { SubscriberDto } from "../subscribers/types/SubscriberDto.generated";

export function useSubscriberControllerGetQuery(
  input: GeneratedEndpointInput<{ id: string; }>,
  options?: GeneratedQueryOptions<SubscriberDto>,
  _config?: unknown,
) {
  return useGeneratedQuery(subscriberControllerGetQuery, input, options);
}
