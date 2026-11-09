import { defineQueryBinding } from "../runtime/queryRuntime";
import { leadControllerGetTransportMetadata } from "./leadControllerGetTransport.transport.generated";
import type { LeadDto } from "../leads/types/LeadDto.generated";
export const leadControllerGetQuery = defineQueryBinding<{ id: string; }, LeadDto>({
  endpointKey: "get:/api/leads/{id}",
  transportMetadata: leadControllerGetTransportMetadata,
  realtimeLinks: [],
  availability: {"featureKeys": [], "policyKeys": ["Lead.Read"], "capabilityKeys": [], "providerKeys": [], "environmentScopes": [], "disabledReasonKey": null},
  errorRefs: ["lead.not_found"],
});
