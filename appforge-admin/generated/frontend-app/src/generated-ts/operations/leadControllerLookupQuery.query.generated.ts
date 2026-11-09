import { defineQueryBinding } from "../runtime/queryRuntime";
import { leadControllerLookupTransportMetadata } from "./leadControllerLookupTransport.transport.generated";
import type { LeadLookupDto } from "../leads/types/LeadLookupDto.generated";import type { LookupLeadRequest } from "../leads/types/LookupLeadRequest.generated";
export const leadControllerLookupQuery = defineQueryBinding<{ request: LookupLeadRequest; }, LeadLookupDto[]>({
  endpointKey: "get:/api/leads/lookup",
  transportMetadata: leadControllerLookupTransportMetadata,
  realtimeLinks: [],
  availability: {"featureKeys": [], "policyKeys": ["Lead.Read"], "capabilityKeys": [], "providerKeys": [], "environmentScopes": [], "disabledReasonKey": null},
  errorRefs: [],
});
