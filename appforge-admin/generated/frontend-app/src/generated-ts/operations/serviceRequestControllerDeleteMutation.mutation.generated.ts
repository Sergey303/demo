import { defineMutationBinding } from "../runtime/mutationRuntime";
import { serviceRequestControllerDeleteTransportMetadata } from "./serviceRequestControllerDeleteTransport.transport.generated";

export const serviceRequestControllerDeleteMutation = defineMutationBinding<{ id: string; }, void>({
  endpointKey: "delete:/api/servicerequests/{id}",
  transportMetadata: serviceRequestControllerDeleteTransportMetadata,
  invalidatesEndpointKeys: ["get:/api/servicerequests", "get:/api/servicerequests/lookup", "get:/api/servicerequests/options/{field}", "get:/api/servicerequests/suggest/{field}", "get:/api/servicerequests/{id}"],
  durability: {"databaseName": "appforge-restcrud-servicerequest-delete", "payloadSchemaVersion": 3354247637335421, "idempotencyHeaderName": "Idempotency-Key", "scopeKey": "delete:/api/servicerequests/{id}", "retryPolicy": {"initialDelayMs": 1500, "maxDelayMs": 30000, "multiplier": 2, "maxAttempts": 5}, "staleSendingAfterMs": 30000, "maxDeliveryAgeMs": 2419200000},
  realtimeLinks: [],
  availability: {"featureKeys": [], "policyKeys": ["ServiceRequest.Delete"], "capabilityKeys": [], "providerKeys": [], "environmentScopes": [], "disabledReasonKey": null},
  errorRefs: ["service.request.idempotency_conflict", "service.request.idempotency_key_invalid", "service.request.idempotency_key_required", "service.request.not_found"],
});
