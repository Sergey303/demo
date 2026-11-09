import { defineQueryBinding } from "../runtime/queryRuntime";
import { campaignStatusControllerSuggestTransportMetadata } from "./campaignStatusControllerSuggestTransport.transport.generated";
import type { CampaignStatusSuggestionDto } from "../campaignstatuses/types/CampaignStatusSuggestionDto.generated";import type { SuggestCampaignStatusRequest } from "../campaignstatuses/types/SuggestCampaignStatusRequest.generated";
export const campaignStatusControllerSuggestQuery = defineQueryBinding<{ field: string; request: SuggestCampaignStatusRequest; }, CampaignStatusSuggestionDto[]>({
  endpointKey: "get:/api/campaignstatuses/suggest/{field}",
  transportMetadata: campaignStatusControllerSuggestTransportMetadata,
  realtimeLinks: [],
  availability: {"featureKeys": [], "policyKeys": ["CampaignStatus.Read"], "capabilityKeys": [], "providerKeys": [], "environmentScopes": [], "disabledReasonKey": null},
  errorRefs: [],
});
