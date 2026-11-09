// ------------------------------------------------------------------------------
// GENERATED FILE - source: campaigns/endpoints.json
// DO NOT EDIT MANUALLY.
// ------------------------------------------------------------------------------

import { useGeneratedMutation } from "../runtime/reactQueryRuntime";
import type { GeneratedMutationOptions } from "../runtime/reactQueryTypes";
import { campaignControllerCreateMutation } from "./campaignControllerCreateMutation.mutation.generated";
import type { CampaignDto } from "../campaigns/types/CampaignDto.generated";
import type { CreateCampaignRequest } from "../campaigns/types/CreateCampaignRequest.generated";

export function useCampaignControllerCreateMutation(
  options?: GeneratedMutationOptions<CreateCampaignRequest, CampaignDto>,
  _config?: unknown,
) {
  return useGeneratedMutation(campaignControllerCreateMutation, options);
}
