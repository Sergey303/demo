import { defineQueryBinding } from "../runtime/queryRuntime";
import { campaignControllerLookupTransportMetadata } from "./campaignControllerLookupTransport.transport.generated";
import type { CampaignLookupDto } from "../campaigns/types/CampaignLookupDto.generated";import type { LookupCampaignRequest } from "../campaigns/types/LookupCampaignRequest.generated";
export const campaignControllerLookupQuery = defineQueryBinding<{ request: LookupCampaignRequest; }, CampaignLookupDto[]>({
  endpointKey: "get:/api/campaigns/lookup",
  transportMetadata: campaignControllerLookupTransportMetadata,
  realtimeLinks: [],
  availability: {"featureKeys": [], "policyKeys": ["Campaign.Read"], "capabilityKeys": [], "providerKeys": [], "environmentScopes": [], "disabledReasonKey": null},
  errorRefs: [],
});
