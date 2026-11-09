import { defineMutationBinding } from "../runtime/mutationRuntime";
import { campaignControllerDeleteTransportMetadata } from "./campaignControllerDeleteTransport.transport.generated";

export const campaignControllerDeleteMutation = defineMutationBinding<{ id: string; }, void>({
  endpointKey: "delete:/api/campaigns/{id}",
  transportMetadata: campaignControllerDeleteTransportMetadata,
  invalidatesEndpointKeys: ["get:/api/campaigns", "get:/api/campaigns/lookup", "get:/api/campaigns/options/{field}", "get:/api/campaigns/suggest/{field}", "get:/api/campaigns/{id}"],
  durability: {"databaseName": "appforge-restcrud-campaign-delete", "payloadSchemaVersion": 8648989469378762, "idempotencyHeaderName": "Idempotency-Key", "scopeKey": "delete:/api/campaigns/{id}", "retryPolicy": {"initialDelayMs": 1500, "maxDelayMs": 30000, "multiplier": 2, "maxAttempts": 5}, "staleSendingAfterMs": 30000, "maxDeliveryAgeMs": 2419200000},
  realtimeLinks: [],
  availability: {"featureKeys": [], "policyKeys": ["Campaign.Delete"], "capabilityKeys": [], "providerKeys": [], "environmentScopes": [], "disabledReasonKey": null},
  errorRefs: ["campaign.idempotency_conflict", "campaign.idempotency_key_invalid", "campaign.idempotency_key_required", "campaign.not_found"],
});
