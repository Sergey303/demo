import { defineQueryBinding } from "../runtime/queryRuntime";
import { leadStatusControllerGetTransportMetadata } from "./leadStatusControllerGetTransport.transport.generated";
import type { LeadStatusDto } from "../leadstatuses/types/LeadStatusDto.generated";
export const leadStatusControllerGetQuery = defineQueryBinding<{ id: string; }, LeadStatusDto>({
  endpointKey: "get:/api/leadstatuses/{id}",
  transportMetadata: leadStatusControllerGetTransportMetadata,
  realtimeLinks: [],
  availability: {"featureKeys": [], "policyKeys": ["LeadStatus.Read"], "capabilityKeys": [], "providerKeys": [], "environmentScopes": [], "disabledReasonKey": null},
  errorRefs: ["lead.status.not_found"],
});
