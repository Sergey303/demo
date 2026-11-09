import { defineQueryBinding } from "../runtime/queryRuntime";
import { leadStatusControllerSuggestTransportMetadata } from "./leadStatusControllerSuggestTransport.transport.generated";
import type { LeadStatusSuggestionDto } from "../leadstatuses/types/LeadStatusSuggestionDto.generated";import type { SuggestLeadStatusRequest } from "../leadstatuses/types/SuggestLeadStatusRequest.generated";
export const leadStatusControllerSuggestQuery = defineQueryBinding<{ field: string; request: SuggestLeadStatusRequest; }, LeadStatusSuggestionDto[]>({
  endpointKey: "get:/api/leadstatuses/suggest/{field}",
  transportMetadata: leadStatusControllerSuggestTransportMetadata,
  realtimeLinks: [],
  availability: {"featureKeys": [], "policyKeys": ["LeadStatus.Read"], "capabilityKeys": [], "providerKeys": [], "environmentScopes": [], "disabledReasonKey": null},
  errorRefs: [],
});
