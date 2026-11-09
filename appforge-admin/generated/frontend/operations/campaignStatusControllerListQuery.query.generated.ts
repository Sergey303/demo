import { defineQueryBinding } from "../runtime/queryRuntime";
import { campaignStatusControllerListTransportMetadata } from "./campaignStatusControllerListTransport.transport.generated";
import type { ListCampaignStatusRequest } from "../campaignstatuses/types/ListCampaignStatusRequest.generated";import type { ListCampaignStatusResult } from "../campaignstatuses/types/ListCampaignStatusResult.generated";
export const campaignStatusControllerListQuery = defineQueryBinding<{ request: ListCampaignStatusRequest; }, ListCampaignStatusResult>({
  endpointKey: "get:/api/campaignstatuses",
  transportMetadata: campaignStatusControllerListTransportMetadata,
  realtimeLinks: [],
  availability: {"featureKeys": [], "policyKeys": ["CampaignStatus.Read"], "capabilityKeys": [], "providerKeys": [], "environmentScopes": [], "disabledReasonKey": null},
  errorRefs: [],
});
