// ------------------------------------------------------------------------------
// GENERATED FILE - source: campaignstatuses/endpoints.json
// DO NOT EDIT MANUALLY.
// ------------------------------------------------------------------------------

import { useGeneratedQuery } from "../runtime/reactQueryRuntime";
import type { GeneratedEndpointInput, GeneratedQueryOptions } from "../runtime/reactQueryTypes";
import { campaignStatusControllerLookupQuery } from "./campaignStatusControllerLookupQuery.query.generated";
import type { CampaignStatusLookupDto } from "../campaignstatuses/types/CampaignStatusLookupDto.generated";
import type { LookupCampaignStatusRequest } from "../campaignstatuses/types/LookupCampaignStatusRequest.generated";

export function useCampaignStatusControllerLookupQuery(
  input: GeneratedEndpointInput<{ request: LookupCampaignStatusRequest; }>,
  options?: GeneratedQueryOptions<CampaignStatusLookupDto[]>,
  _config?: unknown,
) {
  return useGeneratedQuery(campaignStatusControllerLookupQuery, input, options);
}
