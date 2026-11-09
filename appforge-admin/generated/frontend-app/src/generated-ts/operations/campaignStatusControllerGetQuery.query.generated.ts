import { defineQueryBinding } from "../runtime/queryRuntime";
import { campaignStatusControllerGetTransportMetadata } from "./campaignStatusControllerGetTransport.transport.generated";
import type { CampaignStatusDto } from "../campaignstatuses/types/CampaignStatusDto.generated";
export const campaignStatusControllerGetQuery = defineQueryBinding<{ id: string; }, CampaignStatusDto>({
  endpointKey: "get:/api/campaignstatuses/{id}",
  transportMetadata: campaignStatusControllerGetTransportMetadata,
  realtimeLinks: [],
  availability: {"featureKeys": [], "policyKeys": ["CampaignStatus.Read"], "capabilityKeys": [], "providerKeys": [], "environmentScopes": [], "disabledReasonKey": null},
  errorRefs: ["campaign.status.not_found"],
});
