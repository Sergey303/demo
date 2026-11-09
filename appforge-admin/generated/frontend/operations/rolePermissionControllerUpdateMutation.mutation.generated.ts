import { defineMutationBinding } from "../runtime/mutationRuntime";
import { rolePermissionControllerUpdateTransportMetadata } from "./rolePermissionControllerUpdateTransport.transport.generated";
import type { RolePermissionDto } from "../rolepermissions/types/RolePermissionDto.generated";import type { UpdateRolePermissionRequest } from "../rolepermissions/types/UpdateRolePermissionRequest.generated";
export const rolePermissionControllerUpdateMutation = defineMutationBinding<{ id: string; body: UpdateRolePermissionRequest; }, RolePermissionDto>({
  endpointKey: "put:/api/rolepermissions/{id}",
  transportMetadata: rolePermissionControllerUpdateTransportMetadata,
  invalidatesEndpointKeys: ["get:/api/rolepermissions", "get:/api/rolepermissions/lookup", "get:/api/rolepermissions/options/{field}", "get:/api/rolepermissions/suggest/{field}", "get:/api/rolepermissions/{id}"],
  durability: {"databaseName": "appforge-restcrud-rolepermission-update", "payloadSchemaVersion": 545595250555307, "idempotencyHeaderName": "Idempotency-Key", "scopeKey": "put:/api/rolepermissions/{id}", "retryPolicy": {"initialDelayMs": 1500, "maxDelayMs": 30000, "multiplier": 2, "maxAttempts": 5}, "staleSendingAfterMs": 30000, "maxDeliveryAgeMs": 2419200000},
  realtimeLinks: [],
  availability: {"featureKeys": [], "policyKeys": ["RolePermission.Update"], "capabilityKeys": [], "providerKeys": [], "environmentScopes": [], "disabledReasonKey": null},
  errorRefs: ["role.permission.idempotency_conflict", "role.permission.idempotency_key_invalid", "role.permission.idempotency_key_required", "role.permission.not_found", "role.permission.validation_failed"],
});
