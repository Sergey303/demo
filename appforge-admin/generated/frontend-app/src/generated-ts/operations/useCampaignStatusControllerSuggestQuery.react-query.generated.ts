// ------------------------------------------------------------------------------
// GENERATED FILE - source: campaignstatuses/endpoints.json
// DO NOT EDIT MANUALLY.
// ------------------------------------------------------------------------------

import { useGeneratedQuery } from "../runtime/reactQueryRuntime";
import type { GeneratedEndpointInput, GeneratedQueryOptions } from "../runtime/reactQueryTypes";
import { campaignStatusControllerSuggestQuery } from "./campaignStatusControllerSuggestQuery.query.generated";
import type { CampaignStatusSuggestionDto } from "../campaignstatuses/types/CampaignStatusSuggestionDto.generated";
import type { SuggestCampaignStatusRequest } from "../campaignstatuses/types/SuggestCampaignStatusRequest.generated";

export function useCampaignStatusControllerSuggestQuery(
  input: GeneratedEndpointInput<{ field: string; request: SuggestCampaignStatusRequest; }>,
  options?: GeneratedQueryOptions<CampaignStatusSuggestionDto[]>,
  _config?: unknown,
) {
  return useGeneratedQuery(campaignStatusControllerSuggestQuery, input, options);
}
