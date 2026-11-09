// ------------------------------------------------------------------------------
// GENERATED FILE - source: subscribers/endpoints.json
// DO NOT EDIT MANUALLY.
// ------------------------------------------------------------------------------

import { useGeneratedMutation } from "../runtime/reactQueryRuntime";
import type { GeneratedMutationOptions } from "../runtime/reactQueryTypes";
import { subscriberControllerCreateMutation } from "./subscriberControllerCreateMutation.mutation.generated";
import type { CreateSubscriberRequest } from "../subscribers/types/CreateSubscriberRequest.generated";
import type { SubscriberDto } from "../subscribers/types/SubscriberDto.generated";

export function useSubscriberControllerCreateMutation(
  options?: GeneratedMutationOptions<CreateSubscriberRequest, SubscriberDto>,
  _config?: unknown,
) {
  return useGeneratedMutation(subscriberControllerCreateMutation, options);
}
