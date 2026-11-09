import { defineQueryBinding } from "../runtime/queryRuntime";
import { customerControllerLookupTransportMetadata } from "./customerControllerLookupTransport.transport.generated";
import type { CustomerLookupDto } from "../customers/types/CustomerLookupDto.generated";import type { LookupCustomerRequest } from "../customers/types/LookupCustomerRequest.generated";
export const customerControllerLookupQuery = defineQueryBinding<{ request: LookupCustomerRequest; }, CustomerLookupDto[]>({
  endpointKey: "get:/api/customers/lookup",
  transportMetadata: customerControllerLookupTransportMetadata,
  realtimeLinks: [],
  availability: {"featureKeys": [], "policyKeys": ["Customer.Read"], "capabilityKeys": [], "providerKeys": [], "environmentScopes": [], "disabledReasonKey": null},
  errorRefs: [],
});
