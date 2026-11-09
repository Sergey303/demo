// ------------------------------------------------------------------------------
// GENERATED FILE - source: subscriberstatuses/endpoints.json
// DO NOT EDIT MANUALLY.
// ------------------------------------------------------------------------------

import { useGeneratedMutation } from "../runtime/reactQueryRuntime";
import type { GeneratedMutationOptions } from "../runtime/reactQueryTypes";
import { subscriberStatusControllerCreateMutation } from "./subscriberStatusControllerCreateMutation.mutation.generated";
import type { CreateSubscriberStatusRequest } from "../subscriberstatuses/types/CreateSubscriberStatusRequest.generated";
import type { SubscriberStatusDto } from "../subscriberstatuses/types/SubscriberStatusDto.generated";

export function useSubscriberStatusControllerCreateMutation(
  options?: GeneratedMutationOptions<CreateSubscriberStatusRequest, SubscriberStatusDto>,
  _config?: unknown,
) {
  return useGeneratedMutation(subscriberStatusControllerCreateMutation, options);
}
