// ------------------------------------------------------------------------------
// GENERATED FILE - source: subscribers/endpoints.json
// DO NOT EDIT MANUALLY.
// ------------------------------------------------------------------------------

import { useGeneratedQuery } from "../runtime/reactQueryRuntime";
import type { GeneratedEndpointInput, GeneratedQueryOptions } from "../runtime/reactQueryTypes";
import { subscriberControllerOptionsQuery } from "./subscriberControllerOptionsQuery.query.generated";
import type { SubscriberOptionDto } from "../subscribers/types/SubscriberOptionDto.generated";

export function useSubscriberControllerOptionsQuery(
  input: GeneratedEndpointInput<{ field: string; }>,
  options?: GeneratedQueryOptions<SubscriberOptionDto[]>,
  _config?: unknown,
) {
  return useGeneratedQuery(subscriberControllerOptionsQuery, input, options);
}
