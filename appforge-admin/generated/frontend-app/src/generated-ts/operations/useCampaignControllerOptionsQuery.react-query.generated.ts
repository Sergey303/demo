// ------------------------------------------------------------------------------
// GENERATED FILE - source: campaigns/endpoints.json
// DO NOT EDIT MANUALLY.
// ------------------------------------------------------------------------------

import { useGeneratedQuery } from "../runtime/reactQueryRuntime";
import type { GeneratedEndpointInput, GeneratedQueryOptions } from "../runtime/reactQueryTypes";
import { campaignControllerOptionsQuery } from "./campaignControllerOptionsQuery.query.generated";
import type { CampaignOptionDto } from "../campaigns/types/CampaignOptionDto.generated";

export function useCampaignControllerOptionsQuery(
  input: GeneratedEndpointInput<{ field: string; }>,
  options?: GeneratedQueryOptions<CampaignOptionDto[]>,
  _config?: unknown,
) {
  return useGeneratedQuery(campaignControllerOptionsQuery, input, options);
}
