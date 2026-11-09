import { defineMutationBinding } from "../runtime/mutationRuntime";
import { rolePermissionControllerDeleteTransportMetadata } from "./rolePermissionControllerDeleteTransport.transport.generated";

export const rolePermissionControllerDeleteMutation = defineMutationBinding<{ id: string; }, void>({
  endpointKey: "delete:/api/rolepermissions/{id}",
  transportMetadata: rolePermissionControllerDeleteTransportMetadata,
  invalidatesEndpointKeys: ["get:/api/rolepermissions", "get:/api/rolepermissions/lookup", "get:/api/rolepermissions/options/{field}", "get:/api/rolepermissions/suggest/{field}", "get:/api/rolepermissions/{id}"],
  durability: {"databaseName": "appforge-restcrud-rolepermission-delete", "payloadSchemaVersion": 7548106865777437, "idempotencyHeaderName": "Idempotency-Key", "scopeKey": "delete:/api/rolepermissions/{id}", "retryPolicy": {"initialDelayMs": 1500, "maxDelayMs": 30000, "multiplier": 2, "maxAttempts": 5}, "staleSendingAfterMs": 30000, "maxDeliveryAgeMs": 2419200000},
  realtimeLinks: [],
  availability: {"featureKeys": [], "policyKeys": ["RolePermission.Delete"], "capabilityKeys": [], "providerKeys": [], "environmentScopes": [], "disabledReasonKey": null},
  errorRefs: ["role.permission.idempotency_conflict", "role.permission.idempotency_key_invalid", "role.permission.idempotency_key_required", "role.permission.not_found"],
});
