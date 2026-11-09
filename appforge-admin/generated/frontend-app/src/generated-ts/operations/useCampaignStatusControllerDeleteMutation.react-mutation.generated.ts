// ------------------------------------------------------------------------------
// GENERATED FILE - source: campaignstatuses/endpoints.json
// DO NOT EDIT MANUALLY.
// ------------------------------------------------------------------------------

import { useGeneratedMutation } from "../runtime/reactQueryRuntime";
import type { GeneratedMutationOptions } from "../runtime/reactQueryTypes";
import { campaignStatusControllerDeleteMutation } from "./campaignStatusControllerDeleteMutation.mutation.generated";

export function useCampaignStatusControllerDeleteMutation(
  options?: GeneratedMutationOptions<{ id: string; }, void>,
  _config?: unknown,
) {
  return useGeneratedMutation(campaignStatusControllerDeleteMutation, options);
}
