import { defineQueryBinding } from "../runtime/queryRuntime";
import { serviceRequestControllerListTransportMetadata } from "./serviceRequestControllerListTransport.transport.generated";
import type { ListServiceRequestRequest } from "../servicerequests/types/ListServiceRequestRequest.generated";import type { ListServiceRequestResult } from "../servicerequests/types/ListServiceRequestResult.generated";
export const serviceRequestControllerListQuery = defineQueryBinding<{ request: ListServiceRequestRequest; }, ListServiceRequestResult>({
  endpointKey: "get:/api/servicerequests",
  transportMetadata: serviceRequestControllerListTransportMetadata,
  realtimeLinks: [],
  availability: {"featureKeys": [], "policyKeys": ["ServiceRequest.Read"], "capabilityKeys": [], "providerKeys": [], "environmentScopes": [], "disabledReasonKey": null},
  errorRefs: [],
});
