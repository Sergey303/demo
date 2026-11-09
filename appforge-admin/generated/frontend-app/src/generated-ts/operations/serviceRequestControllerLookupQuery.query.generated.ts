import { defineQueryBinding } from "../runtime/queryRuntime";
import { serviceRequestControllerLookupTransportMetadata } from "./serviceRequestControllerLookupTransport.transport.generated";
import type { LookupServiceRequestRequest } from "../servicerequests/types/LookupServiceRequestRequest.generated";import type { ServiceRequestLookupDto } from "../servicerequests/types/ServiceRequestLookupDto.generated";
export const serviceRequestControllerLookupQuery = defineQueryBinding<{ request: LookupServiceRequestRequest; }, ServiceRequestLookupDto[]>({
  endpointKey: "get:/api/servicerequests/lookup",
  transportMetadata: serviceRequestControllerLookupTransportMetadata,
  realtimeLinks: [],
  availability: {"featureKeys": [], "policyKeys": ["ServiceRequest.Read"], "capabilityKeys": [], "providerKeys": [], "environmentScopes": [], "disabledReasonKey": null},
  errorRefs: [],
});
