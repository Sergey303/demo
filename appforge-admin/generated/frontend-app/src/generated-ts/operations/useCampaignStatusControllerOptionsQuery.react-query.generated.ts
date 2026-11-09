// ------------------------------------------------------------------------------
// GENERATED FILE - source: campaignstatuses/endpoints.json
// DO NOT EDIT MANUALLY.
// ------------------------------------------------------------------------------

import { useGeneratedQuery } from "../runtime/reactQueryRuntime";
import type { GeneratedEndpointInput, GeneratedQueryOptions } from "../runtime/reactQueryTypes";
import { campaignStatusControllerOptionsQuery } from "./campaignStatusControllerOptionsQuery.query.generated";
import type { CampaignStatusOptionDto } from "../campaignstatuses/types/CampaignStatusOptionDto.generated";

export function useCampaignStatusControllerOptionsQuery(
  input: GeneratedEndpointInput<{ field: string; }>,
  options?: GeneratedQueryOptions<CampaignStatusOptionDto[]>,
  _config?: unknown,
) {
  return useGeneratedQuery(campaignStatusControllerOptionsQuery, input, options);
}
