import { defineQueryBinding } from "../runtime/queryRuntime";
import { campaignControllerListTransportMetadata } from "./campaignControllerListTransport.transport.generated";
import type { ListCampaignRequest } from "../campaigns/types/ListCampaignRequest.generated";import type { ListCampaignResult } from "../campaigns/types/ListCampaignResult.generated";
export const campaignControllerListQuery = defineQueryBinding<{ request: ListCampaignRequest; }, ListCampaignResult>({
  endpointKey: "get:/api/campaigns",
  transportMetadata: campaignControllerListTransportMetadata,
  realtimeLinks: [],
  availability: {"featureKeys": [], "policyKeys": ["Campaign.Read"], "capabilityKeys": [], "providerKeys": [], "environmentScopes": [], "disabledReasonKey": null},
  errorRefs: [],
});
