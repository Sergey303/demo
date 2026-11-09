import { defineQueryBinding } from "../runtime/queryRuntime";
import { customerControllerOptionsTransportMetadata } from "./customerControllerOptionsTransport.transport.generated";
import type { CustomerOptionDto } from "../customers/types/CustomerOptionDto.generated";
export const customerControllerOptionsQuery = defineQueryBinding<{ field: string; }, CustomerOptionDto[]>({
  endpointKey: "get:/api/customers/options/{field}",
  transportMetadata: customerControllerOptionsTransportMetadata,
  realtimeLinks: [],
  availability: {"featureKeys": [], "policyKeys": ["Customer.Read"], "capabilityKeys": [], "providerKeys": [], "environmentScopes": [], "disabledReasonKey": null},
  errorRefs: [],
});
