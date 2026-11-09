import { defineQueryBinding } from "../runtime/queryRuntime";
import { campaignStatusControllerOptionsTransportMetadata } from "./campaignStatusControllerOptionsTransport.transport.generated";
import type { CampaignStatusOptionDto } from "../campaignstatuses/types/CampaignStatusOptionDto.generated";
export const campaignStatusControllerOptionsQuery = defineQueryBinding<{ field: string; }, CampaignStatusOptionDto[]>({
  endpointKey: "get:/api/campaignstatuses/options/{field}",
  transportMetadata: campaignStatusControllerOptionsTransportMetadata,
  realtimeLinks: [],
  availability: {"featureKeys": [], "policyKeys": ["CampaignStatus.Read"], "capabilityKeys": [], "providerKeys": [], "environmentScopes": [], "disabledReasonKey": null},
  errorRefs: [],
});
