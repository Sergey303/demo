import { defineMutationBinding } from "../runtime/mutationRuntime";
import { serviceRequestControllerCreateTransportMetadata } from "./serviceRequestControllerCreateTransport.transport.generated";
import type { CreateServiceRequestRequest } from "../servicerequests/types/CreateServiceRequestRequest.generated";import type { ServiceRequestDto } from "../servicerequests/types/ServiceRequestDto.generated";
export const serviceRequestControllerCreateMutation = defineMutationBinding<CreateServiceRequestRequest, ServiceRequestDto>({
  endpointKey: "post:/api/servicerequests",
  transportMetadata: serviceRequestControllerCreateTransportMetadata,
  invalidatesEndpointKeys: ["get:/api/servicerequests", "get:/api/servicerequests/lookup", "get:/api/servicerequests/options/{field}", "get:/api/servicerequests/suggest/{field}", "get:/api/servicerequests/{id}"],
  durability: {"databaseName": "appforge-restcrud-servicerequest-create", "payloadSchemaVersion": 3785055088901481, "idempotencyHeaderName": "Idempotency-Key", "scopeKey": "post:/api/servicerequests", "retryPolicy": {"initialDelayMs": 1500, "maxDelayMs": 30000, "multiplier": 2, "maxAttempts": 5}, "staleSendingAfterMs": 30000, "maxDeliveryAgeMs": 2419200000},
  realtimeLinks: [],
  availability: {"featureKeys": [], "policyKeys": ["ServiceRequest.Create"], "capabilityKeys": [], "providerKeys": [], "environmentScopes": [], "disabledReasonKey": null},
  errorRefs: ["service.request.idempotency_conflict", "service.request.idempotency_key_invalid", "service.request.idempotency_key_required", "service.request.validation_failed"],
});
