// ------------------------------------------------------------------------------
// GENERATED FILE - source: campaigns/endpoints.json
// DO NOT EDIT MANUALLY.
// ------------------------------------------------------------------------------

import { useGeneratedQuery } from "../runtime/reactQueryRuntime";
import type { GeneratedEndpointInput, GeneratedQueryOptions } from "../runtime/reactQueryTypes";
import { campaignControllerGetQuery } from "./campaignControllerGetQuery.query.generated";
import type { CampaignDto } from "../campaigns/types/CampaignDto.generated";

export function useCampaignControllerGetQuery(
  input: GeneratedEndpointInput<{ id: string; }>,
  options?: GeneratedQueryOptions<CampaignDto>,
  _config?: unknown,
) {
  return useGeneratedQuery(campaignControllerGetQuery, input, options);
}
