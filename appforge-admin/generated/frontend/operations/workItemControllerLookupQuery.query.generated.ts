import { defineQueryBinding } from "../runtime/queryRuntime";
import { workItemControllerLookupTransportMetadata } from "./workItemControllerLookupTransport.transport.generated";
import type { LookupWorkItemRequest } from "../workitems/types/LookupWorkItemRequest.generated";import type { WorkItemLookupDto } from "../workitems/types/WorkItemLookupDto.generated";
export const workItemControllerLookupQuery = defineQueryBinding<{ request: LookupWorkItemRequest; }, WorkItemLookupDto[]>({
  endpointKey: "get:/api/workitems/lookup",
  transportMetadata: workItemControllerLookupTransportMetadata,
  realtimeLinks: [],
  availability: {"featureKeys": [], "policyKeys": ["WorkItem.Read"], "capabilityKeys": [], "providerKeys": [], "environmentScopes": [], "disabledReasonKey": null},
  errorRefs: [],
});
