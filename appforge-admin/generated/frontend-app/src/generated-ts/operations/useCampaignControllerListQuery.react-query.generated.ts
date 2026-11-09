// ------------------------------------------------------------------------------
// GENERATED FILE - source: campaigns/endpoints.json
// DO NOT EDIT MANUALLY.
// ------------------------------------------------------------------------------

import { useGeneratedQuery } from "../runtime/reactQueryRuntime";
import type { GeneratedEndpointInput, GeneratedQueryOptions } from "../runtime/reactQueryTypes";
import { campaignControllerListQuery } from "./campaignControllerListQuery.query.generated";
import type { ListCampaignRequest } from "../campaigns/types/ListCampaignRequest.generated";
import type { ListCampaignResult } from "../campaigns/types/ListCampaignResult.generated";

export function useCampaignControllerListQuery(
  input: GeneratedEndpointInput<{ request: ListCampaignRequest; }>,
  options?: GeneratedQueryOptions<ListCampaignResult>,
  _config?: unknown,
) {
  return useGeneratedQuery(campaignControllerListQuery, input, options);
}
