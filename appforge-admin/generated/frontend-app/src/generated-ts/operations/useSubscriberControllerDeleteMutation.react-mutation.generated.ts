// ------------------------------------------------------------------------------
// GENERATED FILE - source: subscribers/endpoints.json
// DO NOT EDIT MANUALLY.
// ------------------------------------------------------------------------------

import { useGeneratedMutation } from "../runtime/reactQueryRuntime";
import type { GeneratedMutationOptions } from "../runtime/reactQueryTypes";
import { subscriberControllerDeleteMutation } from "./subscriberControllerDeleteMutation.mutation.generated";

export function useSubscriberControllerDeleteMutation(
  options?: GeneratedMutationOptions<{ id: string; }, void>,
  _config?: unknown,
) {
  return useGeneratedMutation(subscriberControllerDeleteMutation, options);
}
