// ------------------------------------------------------------------------------
// GENERATED FILE - source: campaigns/endpoints.json
// DO NOT EDIT MANUALLY.
// ------------------------------------------------------------------------------

import { useGeneratedQuery } from "../runtime/reactQueryRuntime";
import type { GeneratedEndpointInput, GeneratedQueryOptions } from "../runtime/reactQueryTypes";
import { campaignControllerLookupQuery } from "./campaignControllerLookupQuery.query.generated";
import type { CampaignLookupDto } from "../campaigns/types/CampaignLookupDto.generated";
import type { LookupCampaignRequest } from "../campaigns/types/LookupCampaignRequest.generated";

export function useCampaignControllerLookupQuery(
  input: GeneratedEndpointInput<{ request: LookupCampaignRequest; }>,
  options?: GeneratedQueryOptions<CampaignLookupDto[]>,
  _config?: unknown,
) {
  return useGeneratedQuery(campaignControllerLookupQuery, input, options);
}
