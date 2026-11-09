import { defineMutationBinding } from "../runtime/mutationRuntime";
import { campaignControllerUpdateTransportMetadata } from "./campaignControllerUpdateTransport.transport.generated";
import type { CampaignDto } from "../campaigns/types/CampaignDto.generated";import type { UpdateCampaignRequest } from "../campaigns/types/UpdateCampaignRequest.generated";
export const campaignControllerUpdateMutation = defineMutationBinding<{ id: string; body: UpdateCampaignRequest; }, CampaignDto>({
  endpointKey: "put:/api/campaigns/{id}",
  transportMetadata: campaignControllerUpdateTransportMetadata,
  invalidatesEndpointKeys: ["get:/api/campaigns", "get:/api/campaigns/lookup", "get:/api/campaigns/options/{field}", "get:/api/campaigns/suggest/{field}", "get:/api/campaigns/{id}"],
  durability: {"databaseName": "appforge-restcrud-campaign-update", "payloadSchemaVersion": 862051228805612, "idempotencyHeaderName": "Idempotency-Key", "scopeKey": "put:/api/campaigns/{id}", "retryPolicy": {"initialDelayMs": 1500, "maxDelayMs": 30000, "multiplier": 2, "maxAttempts": 5}, "staleSendingAfterMs": 30000, "maxDeliveryAgeMs": 2419200000},
  realtimeLinks: [],
  availability: {"featureKeys": [], "policyKeys": ["Campaign.Update"], "capabilityKeys": [], "providerKeys": [], "environmentScopes": [], "disabledReasonKey": null},
  errorRefs: ["campaign.idempotency_conflict", "campaign.idempotency_key_invalid", "campaign.idempotency_key_required", "campaign.not_found", "campaign.validation_failed"],
});
