import { defineQueryBinding } from "../runtime/queryRuntime";
import { leadControllerListTransportMetadata } from "./leadControllerListTransport.transport.generated";
import type { ListLeadRequest } from "../leads/types/ListLeadRequest.generated";import type { ListLeadResult } from "../leads/types/ListLeadResult.generated";
export const leadControllerListQuery = defineQueryBinding<{ request: ListLeadRequest; }, ListLeadResult>({
  endpointKey: "get:/api/leads",
  transportMetadata: leadControllerListTransportMetadata,
  realtimeLinks: [],
  availability: {"featureKeys": [], "policyKeys": ["Lead.Read"], "capabilityKeys": [], "providerKeys": [], "environmentScopes": [], "disabledReasonKey": null},
  errorRefs: [],
});
