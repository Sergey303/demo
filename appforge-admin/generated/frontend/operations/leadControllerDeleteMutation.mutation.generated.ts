import { defineMutationBinding } from "../runtime/mutationRuntime";
import { leadControllerDeleteTransportMetadata } from "./leadControllerDeleteTransport.transport.generated";

export const leadControllerDeleteMutation = defineMutationBinding<{ id: string; }, void>({
  endpointKey: "delete:/api/leads/{id}",
  transportMetadata: leadControllerDeleteTransportMetadata,
  invalidatesEndpointKeys: ["get:/api/leads", "get:/api/leads/lookup", "get:/api/leads/options/{field}", "get:/api/leads/suggest/{field}", "get:/api/leads/{id}"],
  durability: {"databaseName": "appforge-restcrud-lead-delete", "payloadSchemaVersion": 8291976936257930, "idempotencyHeaderName": "Idempotency-Key", "scopeKey": "delete:/api/leads/{id}", "retryPolicy": {"initialDelayMs": 1500, "maxDelayMs": 30000, "multiplier": 2, "maxAttempts": 5}, "staleSendingAfterMs": 30000, "maxDeliveryAgeMs": 2419200000},
  realtimeLinks: [],
  availability: {"featureKeys": [], "policyKeys": ["Lead.Delete"], "capabilityKeys": [], "providerKeys": [], "environmentScopes": [], "disabledReasonKey": null},
  errorRefs: ["lead.idempotency_conflict", "lead.idempotency_key_invalid", "lead.idempotency_key_required", "lead.not_found"],
});
