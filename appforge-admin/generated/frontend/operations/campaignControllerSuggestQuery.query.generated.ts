import { defineQueryBinding } from "../runtime/queryRuntime";
import { campaignControllerSuggestTransportMetadata } from "./campaignControllerSuggestTransport.transport.generated";
import type { CampaignSuggestionDto } from "../campaigns/types/CampaignSuggestionDto.generated";import type { SuggestCampaignRequest } from "../campaigns/types/SuggestCampaignRequest.generated";
export const campaignControllerSuggestQuery = defineQueryBinding<{ field: string; request: SuggestCampaignRequest; }, CampaignSuggestionDto[]>({
  endpointKey: "get:/api/campaigns/suggest/{field}",
  transportMetadata: campaignControllerSuggestTransportMetadata,
  realtimeLinks: [],
  availability: {"featureKeys": [], "policyKeys": ["Campaign.Read"], "capabilityKeys": [], "providerKeys": [], "environmentScopes": [], "disabledReasonKey": null},
  errorRefs: [],
});
