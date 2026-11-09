import { defineQueryBinding } from "../runtime/queryRuntime";
import { campaignControllerGetTransportMetadata } from "./campaignControllerGetTransport.transport.generated";
import type { CampaignDto } from "../campaigns/types/CampaignDto.generated";
export const campaignControllerGetQuery = defineQueryBinding<{ id: string; }, CampaignDto>({
  endpointKey: "get:/api/campaigns/{id}",
  transportMetadata: campaignControllerGetTransportMetadata,
  realtimeLinks: [],
  availability: {"featureKeys": [], "policyKeys": ["Campaign.Read"], "capabilityKeys": [], "providerKeys": [], "environmentScopes": [], "disabledReasonKey": null},
  errorRefs: ["campaign.not_found"],
});
