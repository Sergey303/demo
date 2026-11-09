// ------------------------------------------------------------------------------
// GENERATED FILE - source: campaignstatuses/endpoints.json
// DO NOT EDIT MANUALLY.
// ------------------------------------------------------------------------------

import { useGeneratedMutation } from "../runtime/reactQueryRuntime";
import type { GeneratedMutationOptions } from "../runtime/reactQueryTypes";
import { campaignStatusControllerCreateMutation } from "./campaignStatusControllerCreateMutation.mutation.generated";
import type { CampaignStatusDto } from "../campaignstatuses/types/CampaignStatusDto.generated";
import type { CreateCampaignStatusRequest } from "../campaignstatuses/types/CreateCampaignStatusRequest.generated";

export function useCampaignStatusControllerCreateMutation(
  options?: GeneratedMutationOptions<CreateCampaignStatusRequest, CampaignStatusDto>,
  _config?: unknown,
) {
  return useGeneratedMutation(campaignStatusControllerCreateMutation, options);
}
