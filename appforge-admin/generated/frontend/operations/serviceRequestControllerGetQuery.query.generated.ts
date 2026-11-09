import { defineQueryBinding } from "../runtime/queryRuntime";
import { serviceRequestControllerGetTransportMetadata } from "./serviceRequestControllerGetTransport.transport.generated";
import type { ServiceRequestDto } from "../servicerequests/types/ServiceRequestDto.generated";
export const serviceRequestControllerGetQuery = defineQueryBinding<{ id: string; }, ServiceRequestDto>({
  endpointKey: "get:/api/servicerequests/{id}",
  transportMetadata: serviceRequestControllerGetTransportMetadata,
  realtimeLinks: [],
  availability: {"featureKeys": [], "policyKeys": ["ServiceRequest.Read"], "capabilityKeys": [], "providerKeys": [], "environmentScopes": [], "disabledReasonKey": null},
  errorRefs: ["service.request.not_found"],
});
