import { defineQueryBinding } from "../runtime/queryRuntime";
import { leadStatusControllerLookupTransportMetadata } from "./leadStatusControllerLookupTransport.transport.generated";
import type { LeadStatusLookupDto } from "../leadstatuses/types/LeadStatusLookupDto.generated";import type { LookupLeadStatusRequest } from "../leadstatuses/types/LookupLeadStatusRequest.generated";
export const leadStatusControllerLookupQuery = defineQueryBinding<{ request: LookupLeadStatusRequest; }, LeadStatusLookupDto[]>({
  endpointKey: "get:/api/leadstatuses/lookup",
  transportMetadata: leadStatusControllerLookupTransportMetadata,
  realtimeLinks: [],
  availability: {"featureKeys": [], "policyKeys": ["LeadStatus.Read"], "capabilityKeys": [], "providerKeys": [], "environmentScopes": [], "disabledReasonKey": null},
  errorRefs: [],
});
