import { defineMutationBinding } from "../runtime/mutationRuntime";
import { leadStatusControllerDeleteTransportMetadata } from "./leadStatusControllerDeleteTransport.transport.generated";

export const leadStatusControllerDeleteMutation = defineMutationBinding<{ id: string; }, void>({
  endpointKey: "delete:/api/leadstatuses/{id}",
  transportMetadata: leadStatusControllerDeleteTransportMetadata,
  invalidatesEndpointKeys: ["get:/api/leadstatuses", "get:/api/leadstatuses/lookup", "get:/api/leadstatuses/options/{field}", "get:/api/leadstatuses/suggest/{field}", "get:/api/leadstatuses/{id}"],
  durability: {"databaseName": "appforge-restcrud-leadstatus-delete", "payloadSchemaVersion": 6224200046601492, "idempotencyHeaderName": "Idempotency-Key", "scopeKey": "delete:/api/leadstatuses/{id}", "retryPolicy": {"initialDelayMs": 1500, "maxDelayMs": 30000, "multiplier": 2, "maxAttempts": 5}, "staleSendingAfterMs": 30000, "maxDeliveryAgeMs": 2419200000},
  realtimeLinks: [],
  availability: {"featureKeys": [], "policyKeys": ["LeadStatus.Delete"], "capabilityKeys": [], "providerKeys": [], "environmentScopes": [], "disabledReasonKey": null},
  errorRefs: ["lead.status.idempotency_conflict", "lead.status.idempotency_key_invalid", "lead.status.idempotency_key_required", "lead.status.not_found"],
});
