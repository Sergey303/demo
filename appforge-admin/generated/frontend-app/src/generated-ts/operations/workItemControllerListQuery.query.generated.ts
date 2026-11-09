import { defineQueryBinding } from "../runtime/queryRuntime";
import { workItemControllerListTransportMetadata } from "./workItemControllerListTransport.transport.generated";
import type { ListWorkItemRequest } from "../workitems/types/ListWorkItemRequest.generated";import type { ListWorkItemResult } from "../workitems/types/ListWorkItemResult.generated";
export const workItemControllerListQuery = defineQueryBinding<{ request: ListWorkItemRequest; }, ListWorkItemResult>({
  endpointKey: "get:/api/workitems",
  transportMetadata: workItemControllerListTransportMetadata,
  realtimeLinks: [],
  availability: {"featureKeys": [], "policyKeys": ["WorkItem.Read"], "capabilityKeys": [], "providerKeys": [], "environmentScopes": [], "disabledReasonKey": null},
  errorRefs: [],
});
