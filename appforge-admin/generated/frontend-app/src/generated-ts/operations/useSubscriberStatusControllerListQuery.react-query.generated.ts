// ------------------------------------------------------------------------------
// GENERATED FILE - source: subscriberstatuses/endpoints.json
// DO NOT EDIT MANUALLY.
// ------------------------------------------------------------------------------

import { useGeneratedQuery } from "../runtime/reactQueryRuntime";
import type { GeneratedEndpointInput, GeneratedQueryOptions } from "../runtime/reactQueryTypes";
import { subscriberStatusControllerListQuery } from "./subscriberStatusControllerListQuery.query.generated";
import type { ListSubscriberStatusRequest } from "../subscriberstatuses/types/ListSubscriberStatusRequest.generated";
import type { ListSubscriberStatusResult } from "../subscriberstatuses/types/ListSubscriberStatusResult.generated";

export function useSubscriberStatusControllerListQuery(
  input: GeneratedEndpointInput<{ request: ListSubscriberStatusRequest; }>,
  options?: GeneratedQueryOptions<ListSubscriberStatusResult>,
  _config?: unknown,
) {
  return useGeneratedQuery(subscriberStatusControllerListQuery, input, options);
}
