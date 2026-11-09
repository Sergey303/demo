import { defineMutationBinding } from "../runtime/mutationRuntime";
import { campaignStatusControllerUpdateTransportMetadata } from "./campaignStatusControllerUpdateTransport.transport.generated";
import type { CampaignStatusDto } from "../campaignstatuses/types/CampaignStatusDto.generated";import type { UpdateCampaignStatusRequest } from "../campaignstatuses/types/UpdateCampaignStatusRequest.generated";
export const campaignStatusControllerUpdateMutation = defineMutationBinding<{ id: string; body: UpdateCampaignStatusRequest; }, CampaignStatusDto>({
  endpointKey: "put:/api/campaignstatuses/{id}",
  transportMetadata: campaignStatusControllerUpdateTransportMetadata,
  invalidatesEndpointKeys: ["get:/api/campaignstatuses", "get:/api/campaignstatuses/lookup", "get:/api/campaignstatuses/options/{field}", "get:/api/campaignstatuses/suggest/{field}", "get:/api/campaignstatuses/{id}"],
  durability: {"databaseName": "appforge-restcrud-campaignstatus-update", "payloadSchemaVersion": 5356025298579994, "idempotencyHeaderName": "Idempotency-Key", "scopeKey": "put:/api/campaignstatuses/{id}", "retryPolicy": {"initialDelayMs": 1500, "maxDelayMs": 30000, "multiplier": 2, "maxAttempts": 5}, "staleSendingAfterMs": 30000, "maxDeliveryAgeMs": 2419200000},
  realtimeLinks: [],
  availability: {"featureKeys": [], "policyKeys": ["CampaignStatus.Update"], "capabilityKeys": [], "providerKeys": [], "environmentScopes": [], "disabledReasonKey": null},
  errorRefs: ["campaign.status.idempotency_conflict", "campaign.status.idempotency_key_invalid", "campaign.status.idempotency_key_required", "campaign.status.not_found", "campaign.status.validation_failed"],
});
