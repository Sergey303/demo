import { defineQueryBinding } from "../runtime/queryRuntime";
import { workItemControllerOptionsTransportMetadata } from "./workItemControllerOptionsTransport.transport.generated";
import type { WorkItemOptionDto } from "../workitems/types/WorkItemOptionDto.generated";
export const workItemControllerOptionsQuery = defineQueryBinding<{ field: string; }, WorkItemOptionDto[]>({
  endpointKey: "get:/api/workitems/options/{field}",
  transportMetadata: workItemControllerOptionsTransportMetadata,
  realtimeLinks: [],
  availability: {"featureKeys": [], "policyKeys": ["WorkItem.Read"], "capabilityKeys": [], "providerKeys": [], "environmentScopes": [], "disabledReasonKey": null},
  errorRefs: [],
});
