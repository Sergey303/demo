// ------------------------------------------------------------------------------
// GENERATED FILE - source: subscribers/endpoints.json
// DO NOT EDIT MANUALLY.
// ------------------------------------------------------------------------------

import { useGeneratedMutation } from "../runtime/reactQueryRuntime";
import type { GeneratedMutationOptions } from "../runtime/reactQueryTypes";
import { subscriberControllerUpdateMutation } from "./subscriberControllerUpdateMutation.mutation.generated";
import type { SubscriberDto } from "../subscribers/types/SubscriberDto.generated";
import type { UpdateSubscriberRequest } from "../subscribers/types/UpdateSubscriberRequest.generated";

export function useSubscriberControllerUpdateMutation(
  options?: GeneratedMutationOptions<{ id: string; body: UpdateSubscriberRequest; }, SubscriberDto>,
  _config?: unknown,
) {
  return useGeneratedMutation(subscriberControllerUpdateMutation, options);
}
