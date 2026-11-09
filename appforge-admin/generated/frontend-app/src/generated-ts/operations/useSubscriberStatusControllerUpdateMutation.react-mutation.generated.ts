// ------------------------------------------------------------------------------
// GENERATED FILE - source: subscriberstatuses/endpoints.json
// DO NOT EDIT MANUALLY.
// ------------------------------------------------------------------------------

import { useGeneratedMutation } from "../runtime/reactQueryRuntime";
import type { GeneratedMutationOptions } from "../runtime/reactQueryTypes";
import { subscriberStatusControllerUpdateMutation } from "./subscriberStatusControllerUpdateMutation.mutation.generated";
import type { SubscriberStatusDto } from "../subscriberstatuses/types/SubscriberStatusDto.generated";
import type { UpdateSubscriberStatusRequest } from "../subscriberstatuses/types/UpdateSubscriberStatusRequest.generated";

export function useSubscriberStatusControllerUpdateMutation(
  options?: GeneratedMutationOptions<{ id: string; body: UpdateSubscriberStatusRequest; }, SubscriberStatusDto>,
  _config?: unknown,
) {
  return useGeneratedMutation(subscriberStatusControllerUpdateMutation, options);
}
