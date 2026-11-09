import { defineMutationBinding } from "../runtime/mutationRuntime";
import { roleControllerDeleteTransportMetadata } from "./roleControllerDeleteTransport.transport.generated";

export const roleControllerDeleteMutation = defineMutationBinding<{ id: string; }, void>({
  endpointKey: "delete:/api/roles/{id}",
  transportMetadata: roleControllerDeleteTransportMetadata,
  invalidatesEndpointKeys: ["get:/api/roles", "get:/api/roles/lookup", "get:/api/roles/options/{field}", "get:/api/roles/suggest/{field}", "get:/api/roles/{id}"],
  durability: {"databaseName": "appforge-restcrud-role-delete", "payloadSchemaVersion": 3926672780670426, "idempotencyHeaderName": "Idempotency-Key", "scopeKey": "delete:/api/roles/{id}", "retryPolicy": {"initialDelayMs": 1500, "maxDelayMs": 30000, "multiplier": 2, "maxAttempts": 5}, "staleSendingAfterMs": 30000, "maxDeliveryAgeMs": 2419200000},
  realtimeLinks: [],
  availability: {"featureKeys": [], "policyKeys": ["Role.Delete"], "capabilityKeys": [], "providerKeys": [], "environmentScopes": [], "disabledReasonKey": null},
  errorRefs: ["role.idempotency_conflict", "role.idempotency_key_invalid", "role.idempotency_key_required", "role.not_found"],
});
