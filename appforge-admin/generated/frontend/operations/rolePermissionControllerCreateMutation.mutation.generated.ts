import { defineMutationBinding } from "../runtime/mutationRuntime";
import { rolePermissionControllerCreateTransportMetadata } from "./rolePermissionControllerCreateTransport.transport.generated";
import type { CreateRolePermissionRequest } from "../rolepermissions/types/CreateRolePermissionRequest.generated";import type { RolePermissionDto } from "../rolepermissions/types/RolePermissionDto.generated";
export const rolePermissionControllerCreateMutation = defineMutationBinding<CreateRolePermissionRequest, RolePermissionDto>({
  endpointKey: "post:/api/rolepermissions",
  transportMetadata: rolePermissionControllerCreateTransportMetadata,
  invalidatesEndpointKeys: ["get:/api/rolepermissions", "get:/api/rolepermissions/lookup", "get:/api/rolepermissions/options/{field}", "get:/api/rolepermissions/suggest/{field}", "get:/api/rolepermissions/{id}"],
  durability: {"databaseName": "appforge-restcrud-rolepermission-create", "payloadSchemaVersion": 688561883157089, "idempotencyHeaderName": "Idempotency-Key", "scopeKey": "post:/api/rolepermissions", "retryPolicy": {"initialDelayMs": 1500, "maxDelayMs": 30000, "multiplier": 2, "maxAttempts": 5}, "staleSendingAfterMs": 30000, "maxDeliveryAgeMs": 2419200000},
  realtimeLinks: [],
  availability: {"featureKeys": [], "policyKeys": ["RolePermission.Create"], "capabilityKeys": [], "providerKeys": [], "environmentScopes": [], "disabledReasonKey": null},
  errorRefs: ["role.permission.idempotency_conflict", "role.permission.idempotency_key_invalid", "role.permission.idempotency_key_required", "role.permission.validation_failed"],
});
