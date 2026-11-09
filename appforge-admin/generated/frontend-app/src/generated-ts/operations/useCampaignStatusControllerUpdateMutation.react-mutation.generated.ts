// ------------------------------------------------------------------------------
// GENERATED FILE - source: campaignstatuses/endpoints.json
// DO NOT EDIT MANUALLY.
// ------------------------------------------------------------------------------

import { useGeneratedMutation } from "../runtime/reactQueryRuntime";
import type { GeneratedMutationOptions } from "../runtime/reactQueryTypes";
import { campaignStatusControllerUpdateMutation } from "./campaignStatusControllerUpdateMutation.mutation.generated";
import type { CampaignStatusDto } from "../campaignstatuses/types/CampaignStatusDto.generated";
import type { UpdateCampaignStatusRequest } from "../campaignstatuses/types/UpdateCampaignStatusRequest.generated";

export function useCampaignStatusControllerUpdateMutation(
  options?: GeneratedMutationOptions<{ id: string; body: UpdateCampaignStatusRequest; }, CampaignStatusDto>,
  _config?: unknown,
) {
  return useGeneratedMutation(campaignStatusControllerUpdateMutation, options);
}
