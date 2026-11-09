import { defineMutationBinding } from "../runtime/mutationRuntime";
import { roleControllerUpdateTransportMetadata } from "./roleControllerUpdateTransport.transport.generated";
import type { RoleDto } from "../roles/types/RoleDto.generated";import type { UpdateRoleRequest } from "../roles/types/UpdateRoleRequest.generated";
export const roleControllerUpdateMutation = defineMutationBinding<{ id: string; body: UpdateRoleRequest; }, RoleDto>({
  endpointKey: "put:/api/roles/{id}",
  transportMetadata: roleControllerUpdateTransportMetadata,
  invalidatesEndpointKeys: ["get:/api/roles", "get:/api/roles/lookup", "get:/api/roles/options/{field}", "get:/api/roles/suggest/{field}", "get:/api/roles/{id}"],
  durability: {"databaseName": "appforge-restcrud-role-update", "payloadSchemaVersion": 1271262929869256, "idempotencyHeaderName": "Idempotency-Key", "scopeKey": "put:/api/roles/{id}", "retryPolicy": {"initialDelayMs": 1500, "maxDelayMs": 30000, "multiplier": 2, "maxAttempts": 5}, "staleSendingAfterMs": 30000, "maxDeliveryAgeMs": 2419200000},
  realtimeLinks: [],
  availability: {"featureKeys": [], "policyKeys": ["Role.Update"], "capabilityKeys": [], "providerKeys": [], "environmentScopes": [], "disabledReasonKey": null},
  errorRefs: ["role.idempotency_conflict", "role.idempotency_key_invalid", "role.idempotency_key_required", "role.not_found", "role.validation_failed"],
});
