import { defineMutationBinding } from "../runtime/mutationRuntime";
import { roleControllerCreateTransportMetadata } from "./roleControllerCreateTransport.transport.generated";
import type { CreateRoleRequest } from "../roles/types/CreateRoleRequest.generated";import type { RoleDto } from "../roles/types/RoleDto.generated";
export const roleControllerCreateMutation = defineMutationBinding<CreateRoleRequest, RoleDto>({
  endpointKey: "post:/api/roles",
  transportMetadata: roleControllerCreateTransportMetadata,
  invalidatesEndpointKeys: ["get:/api/roles", "get:/api/roles/lookup", "get:/api/roles/options/{field}", "get:/api/roles/suggest/{field}", "get:/api/roles/{id}"],
  durability: {"databaseName": "appforge-restcrud-role-create", "payloadSchemaVersion": 8385420294852266, "idempotencyHeaderName": "Idempotency-Key", "scopeKey": "post:/api/roles", "retryPolicy": {"initialDelayMs": 1500, "maxDelayMs": 30000, "multiplier": 2, "maxAttempts": 5}, "staleSendingAfterMs": 30000, "maxDeliveryAgeMs": 2419200000},
  realtimeLinks: [],
  availability: {"featureKeys": [], "policyKeys": ["Role.Create"], "capabilityKeys": [], "providerKeys": [], "environmentScopes": [], "disabledReasonKey": null},
  errorRefs: ["role.idempotency_conflict", "role.idempotency_key_invalid", "role.idempotency_key_required", "role.validation_failed"],
});
