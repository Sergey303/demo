import { defineQueryBinding } from "../runtime/queryRuntime";
import { leadControllerOptionsTransportMetadata } from "./leadControllerOptionsTransport.transport.generated";
import type { LeadOptionDto } from "../leads/types/LeadOptionDto.generated";
export const leadControllerOptionsQuery = defineQueryBinding<{ field: string; }, LeadOptionDto[]>({
  endpointKey: "get:/api/leads/options/{field}",
  transportMetadata: leadControllerOptionsTransportMetadata,
  realtimeLinks: [],
  availability: {"featureKeys": [], "policyKeys": ["Lead.Read"], "capabilityKeys": [], "providerKeys": [], "environmentScopes": [], "disabledReasonKey": null},
  errorRefs: [],
});
