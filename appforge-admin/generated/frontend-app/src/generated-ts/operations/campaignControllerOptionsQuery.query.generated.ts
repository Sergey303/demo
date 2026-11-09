import { defineQueryBinding } from "../runtime/queryRuntime";
import { campaignControllerOptionsTransportMetadata } from "./campaignControllerOptionsTransport.transport.generated";
import type { CampaignOptionDto } from "../campaigns/types/CampaignOptionDto.generated";
export const campaignControllerOptionsQuery = defineQueryBinding<{ field: string; }, CampaignOptionDto[]>({
  endpointKey: "get:/api/campaigns/options/{field}",
  transportMetadata: campaignControllerOptionsTransportMetadata,
  realtimeLinks: [],
  availability: {"featureKeys": [], "policyKeys": ["Campaign.Read"], "capabilityKeys": [], "providerKeys": [], "environmentScopes": [], "disabledReasonKey": null},
  errorRefs: [],
});
