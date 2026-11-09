import { defineQueryBinding } from "../runtime/queryRuntime";
import { campaignStatusControllerLookupTransportMetadata } from "./campaignStatusControllerLookupTransport.transport.generated";
import type { CampaignStatusLookupDto } from "../campaignstatuses/types/CampaignStatusLookupDto.generated";import type { LookupCampaignStatusRequest } from "../campaignstatuses/types/LookupCampaignStatusRequest.generated";
export const campaignStatusControllerLookupQuery = defineQueryBinding<{ request: LookupCampaignStatusRequest; }, CampaignStatusLookupDto[]>({
  endpointKey: "get:/api/campaignstatuses/lookup",
  transportMetadata: campaignStatusControllerLookupTransportMetadata,
  realtimeLinks: [],
  availability: {"featureKeys": [], "policyKeys": ["CampaignStatus.Read"], "capabilityKeys": [], "providerKeys": [], "environmentScopes": [], "disabledReasonKey": null},
  errorRefs: [],
});
