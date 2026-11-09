import { defineQueryBinding } from "../runtime/queryRuntime";
import { leadStatusControllerListTransportMetadata } from "./leadStatusControllerListTransport.transport.generated";
import type { ListLeadStatusRequest } from "../leadstatuses/types/ListLeadStatusRequest.generated";import type { ListLeadStatusResult } from "../leadstatuses/types/ListLeadStatusResult.generated";
export const leadStatusControllerListQuery = defineQueryBinding<{ request: ListLeadStatusRequest; }, ListLeadStatusResult>({
  endpointKey: "get:/api/leadstatuses",
  transportMetadata: leadStatusControllerListTransportMetadata,
  realtimeLinks: [],
  availability: {"featureKeys": [], "policyKeys": ["LeadStatus.Read"], "capabilityKeys": [], "providerKeys": [], "environmentScopes": [], "disabledReasonKey": null},
  errorRefs: [],
});
