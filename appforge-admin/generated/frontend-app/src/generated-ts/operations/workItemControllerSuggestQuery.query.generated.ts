import { defineQueryBinding } from "../runtime/queryRuntime";
import { workItemControllerSuggestTransportMetadata } from "./workItemControllerSuggestTransport.transport.generated";
import type { SuggestWorkItemRequest } from "../workitems/types/SuggestWorkItemRequest.generated";import type { WorkItemSuggestionDto } from "../workitems/types/WorkItemSuggestionDto.generated";
export const workItemControllerSuggestQuery = defineQueryBinding<{ field: string; request: SuggestWorkItemRequest; }, WorkItemSuggestionDto[]>({
  endpointKey: "get:/api/workitems/suggest/{field}",
  transportMetadata: workItemControllerSuggestTransportMetadata,
  realtimeLinks: [],
  availability: {"featureKeys": [], "policyKeys": ["WorkItem.Read"], "capabilityKeys": [], "providerKeys": [], "environmentScopes": [], "disabledReasonKey": null},
  errorRefs: [],
});
