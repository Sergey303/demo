// ------------------------------------------------------------------------------
// GENERATED FILE - source: campaignstatuses/endpoints.json
// DO NOT EDIT MANUALLY.
// ------------------------------------------------------------------------------

import { useGeneratedQuery } from "../runtime/reactQueryRuntime";
import type { GeneratedEndpointInput, GeneratedQueryOptions } from "../runtime/reactQueryTypes";
import { campaignStatusControllerListQuery } from "./campaignStatusControllerListQuery.query.generated";
import type { ListCampaignStatusRequest } from "../campaignstatuses/types/ListCampaignStatusRequest.generated";
import type { ListCampaignStatusResult } from "../campaignstatuses/types/ListCampaignStatusResult.generated";

export function useCampaignStatusControllerListQuery(
  input: GeneratedEndpointInput<{ request: ListCampaignStatusRequest; }>,
  options?: GeneratedQueryOptions<ListCampaignStatusResult>,
  _config?: unknown,
) {
  return useGeneratedQuery(campaignStatusControllerListQuery, input, options);
}
