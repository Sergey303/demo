import { defineQueryBinding } from "../runtime/queryRuntime";
import { serviceRequestControllerSuggestTransportMetadata } from "./serviceRequestControllerSuggestTransport.transport.generated";
import type { ServiceRequestSuggestionDto } from "../servicerequests/types/ServiceRequestSuggestionDto.generated";import type { SuggestServiceRequestRequest } from "../servicerequests/types/SuggestServiceRequestRequest.generated";
export const serviceRequestControllerSuggestQuery = defineQueryBinding<{ field: string; request: SuggestServiceRequestRequest; }, ServiceRequestSuggestionDto[]>({
  endpointKey: "get:/api/servicerequests/suggest/{field}",
  transportMetadata: serviceRequestControllerSuggestTransportMetadata,
  realtimeLinks: [],
  availability: {"featureKeys": [], "policyKeys": ["ServiceRequest.Read"], "capabilityKeys": [], "providerKeys": [], "environmentScopes": [], "disabledReasonKey": null},
  errorRefs: [],
});
