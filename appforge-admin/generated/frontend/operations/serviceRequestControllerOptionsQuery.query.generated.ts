import { defineQueryBinding } from "../runtime/queryRuntime";
import { serviceRequestControllerOptionsTransportMetadata } from "./serviceRequestControllerOptionsTransport.transport.generated";
import type { ServiceRequestOptionDto } from "../servicerequests/types/ServiceRequestOptionDto.generated";
export const serviceRequestControllerOptionsQuery = defineQueryBinding<{ field: string; }, ServiceRequestOptionDto[]>({
  endpointKey: "get:/api/servicerequests/options/{field}",
  transportMetadata: serviceRequestControllerOptionsTransportMetadata,
  realtimeLinks: [],
  availability: {"featureKeys": [], "policyKeys": ["ServiceRequest.Read"], "capabilityKeys": [], "providerKeys": [], "environmentScopes": [], "disabledReasonKey": null},
  errorRefs: [],
});
