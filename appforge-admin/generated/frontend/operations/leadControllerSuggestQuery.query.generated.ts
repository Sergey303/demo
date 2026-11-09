import { defineQueryBinding } from "../runtime/queryRuntime";
import { leadControllerSuggestTransportMetadata } from "./leadControllerSuggestTransport.transport.generated";
import type { LeadSuggestionDto } from "../leads/types/LeadSuggestionDto.generated";import type { SuggestLeadRequest } from "../leads/types/SuggestLeadRequest.generated";
export const leadControllerSuggestQuery = defineQueryBinding<{ field: string; request: SuggestLeadRequest; }, LeadSuggestionDto[]>({
  endpointKey: "get:/api/leads/suggest/{field}",
  transportMetadata: leadControllerSuggestTransportMetadata,
  realtimeLinks: [],
  availability: {"featureKeys": [], "policyKeys": ["Lead.Read"], "capabilityKeys": [], "providerKeys": [], "environmentScopes": [], "disabledReasonKey": null},
  errorRefs: [],
});
