// ------------------------------------------------------------------------------
// GENERATED FILE - source: campaigns/endpoints.json
// DO NOT EDIT MANUALLY.
// ------------------------------------------------------------------------------

import { useGeneratedQuery } from "../runtime/reactQueryRuntime";
import type { GeneratedEndpointInput, GeneratedQueryOptions } from "../runtime/reactQueryTypes";
import { campaignControllerSuggestQuery } from "./campaignControllerSuggestQuery.query.generated";
import type { CampaignSuggestionDto } from "../campaigns/types/CampaignSuggestionDto.generated";
import type { SuggestCampaignRequest } from "../campaigns/types/SuggestCampaignRequest.generated";

export function useCampaignControllerSuggestQuery(
  input: GeneratedEndpointInput<{ field: string; request: SuggestCampaignRequest; }>,
  options?: GeneratedQueryOptions<CampaignSuggestionDto[]>,
  _config?: unknown,
) {
  return useGeneratedQuery(campaignControllerSuggestQuery, input, options);
}
