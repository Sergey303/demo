import { defineMutationBinding } from "../runtime/mutationRuntime";
import { permissionControllerDeleteTransportMetadata } from "./permissionControllerDeleteTransport.transport.generated";

export const permissionControllerDeleteMutation = defineMutationBinding<{ id: string; }, void>({
  endpointKey: "delete:/api/permissions/{id}",
  transportMetadata: permissionControllerDeleteTransportMetadata,
  invalidatesEndpointKeys: ["get:/api/permissions", "get:/api/permissions/lookup", "get:/api/permissions/options/{field}", "get:/api/permissions/suggest/{field}", "get:/api/permissions/{id}"],
  durability: {"databaseName": "appforge-restcrud-permission-delete", "payloadSchemaVersion": 5529879886381218, "idempotencyHeaderName": "Idempotency-Key", "scopeKey": "delete:/api/permissions/{id}", "retryPolicy": {"initialDelayMs": 1500, "maxDelayMs": 30000, "multiplier": 2, "maxAttempts": 5}, "staleSendingAfterMs": 30000, "maxDeliveryAgeMs": 2419200000},
  realtimeLinks: [],
  availability: {"featureKeys": [], "policyKeys": ["Permission.Delete"], "capabilityKeys": [], "providerKeys": [], "environmentScopes": [], "disabledReasonKey": null},
  errorRefs: ["permission.idempotency_conflict", "permission.idempotency_key_invalid", "permission.idempotency_key_required", "permission.not_found"],
});
