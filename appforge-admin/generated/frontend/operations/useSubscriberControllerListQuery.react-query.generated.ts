// ------------------------------------------------------------------------------
// GENERATED FILE - source: subscribers/endpoints.json
// DO NOT EDIT MANUALLY.
// ------------------------------------------------------------------------------

import { useGeneratedQuery } from "../runtime/reactQueryRuntime";
import type { GeneratedEndpointInput, GeneratedQueryOptions } from "../runtime/reactQueryTypes";
import { subscriberControllerListQuery } from "./subscriberControllerListQuery.query.generated";
import type { ListSubscriberRequest } from "../subscribers/types/ListSubscriberRequest.generated";
import type { ListSubscriberResult } from "../subscribers/types/ListSubscriberResult.generated";

export function useSubscriberControllerListQuery(
  input: GeneratedEndpointInput<{ request: ListSubscriberRequest; }>,
  options?: GeneratedQueryOptions<ListSubscriberResult>,
  _config?: unknown,
) {
  return useGeneratedQuery(subscriberControllerListQuery, input, options);
}
