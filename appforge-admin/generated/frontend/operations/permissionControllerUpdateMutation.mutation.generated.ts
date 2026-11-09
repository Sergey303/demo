import { defineMutationBinding } from "../runtime/mutationRuntime";
import { permissionControllerUpdateTransportMetadata } from "./permissionControllerUpdateTransport.transport.generated";
import type { PermissionDto } from "../permissions/types/PermissionDto.generated";import type { UpdatePermissionRequest } from "../permissions/types/UpdatePermissionRequest.generated";
export const permissionControllerUpdateMutation = defineMutationBinding<{ id: string; body: UpdatePermissionRequest; }, PermissionDto>({
  endpointKey: "put:/api/permissions/{id}",
  transportMetadata: permissionControllerUpdateTransportMetadata,
  invalidatesEndpointKeys: ["get:/api/permissions", "get:/api/permissions/lookup", "get:/api/permissions/options/{field}", "get:/api/permissions/suggest/{field}", "get:/api/permissions/{id}"],
  durability: {"databaseName": "appforge-restcrud-permission-update", "payloadSchemaVersion": 1540647298125420, "idempotencyHeaderName": "Idempotency-Key", "scopeKey": "put:/api/permissions/{id}", "retryPolicy": {"initialDelayMs": 1500, "maxDelayMs": 30000, "multiplier": 2, "maxAttempts": 5}, "staleSendingAfterMs": 30000, "maxDeliveryAgeMs": 2419200000},
  realtimeLinks: [],
  availability: {"featureKeys": [], "policyKeys": ["Permission.Update"], "capabilityKeys": [], "providerKeys": [], "environmentScopes": [], "disabledReasonKey": null},
  errorRefs: ["permission.idempotency_conflict", "permission.idempotency_key_invalid", "permission.idempotency_key_required", "permission.not_found", "permission.validation_failed"],
});
