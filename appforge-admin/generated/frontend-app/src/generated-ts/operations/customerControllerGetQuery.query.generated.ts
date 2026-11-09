import { defineQueryBinding } from "../runtime/queryRuntime";
import { customerControllerGetTransportMetadata } from "./customerControllerGetTransport.transport.generated";
import type { CustomerDto } from "../customers/types/CustomerDto.generated";
export const customerControllerGetQuery = defineQueryBinding<{ id: string; }, CustomerDto>({
  endpointKey: "get:/api/customers/{id}",
  transportMetadata: customerControllerGetTransportMetadata,
  realtimeLinks: [],
  availability: {"featureKeys": [], "policyKeys": ["Customer.Read"], "capabilityKeys": [], "providerKeys": [], "environmentScopes": [], "disabledReasonKey": null},
  errorRefs: ["customer.not_found"],
});
