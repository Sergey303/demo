import { defineQueryBinding } from "../runtime/queryRuntime";
import { leadStatusControllerOptionsTransportMetadata } from "./leadStatusControllerOptionsTransport.transport.generated";
import type { LeadStatusOptionDto } from "../leadstatuses/types/LeadStatusOptionDto.generated";
export const leadStatusControllerOptionsQuery = defineQueryBinding<{ field: string; }, LeadStatusOptionDto[]>({
  endpointKey: "get:/api/leadstatuses/options/{field}",
  transportMetadata: leadStatusControllerOptionsTransportMetadata,
  realtimeLinks: [],
  availability: {"featureKeys": [], "policyKeys": ["LeadStatus.Read"], "capabilityKeys": [], "providerKeys": [], "environmentScopes": [], "disabledReasonKey": null},
  errorRefs: [],
});
