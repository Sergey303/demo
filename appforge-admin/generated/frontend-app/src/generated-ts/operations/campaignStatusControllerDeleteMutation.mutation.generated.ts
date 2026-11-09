import { defineMutationBinding } from "../runtime/mutationRuntime";
import { campaignStatusControllerDeleteTransportMetadata } from "./campaignStatusControllerDeleteTransport.transport.generated";

export const campaignStatusControllerDeleteMutation = defineMutationBinding<{ id: string; }, void>({
  endpointKey: "delete:/api/campaignstatuses/{id}",
  transportMetadata: campaignStatusControllerDeleteTransportMetadata,
  invalidatesEndpointKeys: ["get:/api/campaignstatuses", "get:/api/campaignstatuses/lookup", "get:/api/campaignstatuses/options/{field}", "get:/api/campaignstatuses/suggest/{field}", "get:/api/campaignstatuses/{id}"],
  durability: {"databaseName": "appforge-restcrud-campaignstatus-delete", "payloadSchemaVersion": 2451263957617998, "idempotencyHeaderName": "Idempotency-Key", "scopeKey": "delete:/api/campaignstatuses/{id}", "retryPolicy": {"initialDelayMs": 1500, "maxDelayMs": 30000, "multiplier": 2, "maxAttempts": 5}, "staleSendingAfterMs": 30000, "maxDeliveryAgeMs": 2419200000},
  realtimeLinks: [],
  availability: {"featureKeys": [], "policyKeys": ["CampaignStatus.Delete"], "capabilityKeys": [], "providerKeys": [], "environmentScopes": [], "disabledReasonKey": null},
  errorRefs: ["campaign.status.idempotency_conflict", "campaign.status.idempotency_key_invalid", "campaign.status.idempotency_key_required", "campaign.status.not_found"],
});
