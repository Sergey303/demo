import { defineMutationBinding } from "../runtime/mutationRuntime";
import { permissionControllerCreateTransportMetadata } from "./permissionControllerCreateTransport.transport.generated";
import type { CreatePermissionRequest } from "../permissions/types/CreatePermissionRequest.generated";import type { PermissionDto } from "../permissions/types/PermissionDto.generated";
export const permissionControllerCreateMutation = defineMutationBinding<CreatePermissionRequest, PermissionDto>({
  endpointKey: "post:/api/permissions",
  transportMetadata: permissionControllerCreateTransportMetadata,
  invalidatesEndpointKeys: ["get:/api/permissions", "get:/api/permissions/lookup", "get:/api/permissions/options/{field}", "get:/api/permissions/suggest/{field}", "get:/api/permissions/{id}"],
  durability: {"databaseName": "appforge-restcrud-permission-create", "payloadSchemaVersion": 6770042610246961, "idempotencyHeaderName": "Idempotency-Key", "scopeKey": "post:/api/permissions", "retryPolicy": {"initialDelayMs": 1500, "maxDelayMs": 30000, "multiplier": 2, "maxAttempts": 5}, "staleSendingAfterMs": 30000, "maxDeliveryAgeMs": 2419200000},
  realtimeLinks: [],
  availability: {"featureKeys": [], "policyKeys": ["Permission.Create"], "capabilityKeys": [], "providerKeys": [], "environmentScopes": [], "disabledReasonKey": null},
  errorRefs: ["permission.idempotency_conflict", "permission.idempotency_key_invalid", "permission.idempotency_key_required", "permission.validation_failed"],
});
