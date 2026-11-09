import { defineQueryBinding } from "../runtime/queryRuntime";
import { workItemControllerGetTransportMetadata } from "./workItemControllerGetTransport.transport.generated";
import type { WorkItemDto } from "../workitems/types/WorkItemDto.generated";
export const workItemControllerGetQuery = defineQueryBinding<{ id: string; }, WorkItemDto>({
  endpointKey: "get:/api/workitems/{id}",
  transportMetadata: workItemControllerGetTransportMetadata,
  realtimeLinks: [],
  availability: {"featureKeys": [], "policyKeys": ["WorkItem.Read"], "capabilityKeys": [], "providerKeys": [], "environmentScopes": [], "disabledReasonKey": null},
  errorRefs: ["work.item.not_found"],
});
