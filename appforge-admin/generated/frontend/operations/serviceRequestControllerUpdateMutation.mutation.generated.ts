import { defineMutationBinding } from "../runtime/mutationRuntime";
import { serviceRequestControllerUpdateTransportMetadata } from "./serviceRequestControllerUpdateTransport.transport.generated";
import type { ServiceRequestDto } from "../servicerequests/types/ServiceRequestDto.generated";import type { UpdateServiceRequestRequest } from "../servicerequests/types/UpdateServiceRequestRequest.generated";
export const serviceRequestControllerUpdateMutation = defineMutationBinding<{ id: string; body: UpdateServiceRequestRequest; }, ServiceRequestDto>({
  endpointKey: "put:/api/servicerequests/{id}",
  transportMetadata: serviceRequestControllerUpdateTransportMetadata,
  invalidatesEndpointKeys: ["get:/api/servicerequests", "get:/api/servicerequests/lookup", "get:/api/servicerequests/options/{field}", "get:/api/servicerequests/suggest/{field}", "get:/api/servicerequests/{id}"],
  durability: {"databaseName": "appforge-restcrud-servicerequest-update", "payloadSchemaVersion": 2584968402667104, "idempotencyHeaderName": "Idempotency-Key", "scopeKey": "put:/api/servicerequests/{id}", "retryPolicy": {"initialDelayMs": 1500, "maxDelayMs": 30000, "multiplier": 2, "maxAttempts": 5}, "staleSendingAfterMs": 30000, "maxDeliveryAgeMs": 2419200000},
  realtimeLinks: [],
  availability: {"featureKeys": [], "policyKeys": ["ServiceRequest.Update"], "capabilityKeys": [], "providerKeys": [], "environmentScopes": [], "disabledReasonKey": null},
  errorRefs: ["service.request.idempotency_conflict", "service.request.idempotency_key_invalid", "service.request.idempotency_key_required", "service.request.not_found", "service.request.validation_failed"],
});
