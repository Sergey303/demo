// ------------------------------------------------------------------------------
// GENERATED FILE - source: campaignstatuses/endpoints.json
// DO NOT EDIT MANUALLY.
// ------------------------------------------------------------------------------

import { useGeneratedQuery } from "../runtime/reactQueryRuntime";
import type { GeneratedEndpointInput, GeneratedQueryOptions } from "../runtime/reactQueryTypes";
import { campaignStatusControllerGetQuery } from "./campaignStatusControllerGetQuery.query.generated";
import type { CampaignStatusDto } from "../campaignstatuses/types/CampaignStatusDto.generated";

export function useCampaignStatusControllerGetQuery(
  input: GeneratedEndpointInput<{ id: string; }>,
  options?: GeneratedQueryOptions<CampaignStatusDto>,
  _config?: unknown,
) {
  return useGeneratedQuery(campaignStatusControllerGetQuery, input, options);
}
