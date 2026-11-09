// ------------------------------------------------------------------------------
// GENERATED FILE - source: subscriberstatuses/endpoints.json
// DO NOT EDIT MANUALLY.
// ------------------------------------------------------------------------------

import { useGeneratedMutation } from "../runtime/reactQueryRuntime";
import type { GeneratedMutationOptions } from "../runtime/reactQueryTypes";
import { subscriberStatusControllerDeleteMutation } from "./subscriberStatusControllerDeleteMutation.mutation.generated";

export function useSubscriberStatusControllerDeleteMutation(
  options?: GeneratedMutationOptions<{ id: string; }, void>,
  _config?: unknown,
) {
  return useGeneratedMutation(subscriberStatusControllerDeleteMutation, options);
}
