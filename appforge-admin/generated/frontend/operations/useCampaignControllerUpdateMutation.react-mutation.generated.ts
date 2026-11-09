// ------------------------------------------------------------------------------
// GENERATED FILE - source: campaigns/endpoints.json
// DO NOT EDIT MANUALLY.
// ------------------------------------------------------------------------------

import { useGeneratedMutation } from "../runtime/reactQueryRuntime";
import type { GeneratedMutationOptions } from "../runtime/reactQueryTypes";
import { campaignControllerUpdateMutation } from "./campaignControllerUpdateMutation.mutation.generated";
import type { CampaignDto } from "../campaigns/types/CampaignDto.generated";
import type { UpdateCampaignRequest } from "../campaigns/types/UpdateCampaignRequest.generated";

export function useCampaignControllerUpdateMutation(
  options?: GeneratedMutationOptions<{ id: string; body: UpdateCampaignRequest; }, CampaignDto>,
  _config?: unknown,
) {
  return useGeneratedMutation(campaignControllerUpdateMutation, options);
}
