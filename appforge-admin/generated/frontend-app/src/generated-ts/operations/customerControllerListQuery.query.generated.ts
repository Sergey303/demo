import { defineQueryBinding } from "../runtime/queryRuntime";
import { customerControllerListTransportMetadata } from "./customerControllerListTransport.transport.generated";
import type { ListCustomerRequest } from "../customers/types/ListCustomerRequest.generated";import type { ListCustomerResult } from "../customers/types/ListCustomerResult.generated";
export const customerControllerListQuery = defineQueryBinding<{ request: ListCustomerRequest; }, ListCustomerResult>({
  endpointKey: "get:/api/customers",
  transportMetadata: customerControllerListTransportMetadata,
  realtimeLinks: [],
  availability: {"featureKeys": [], "policyKeys": ["Customer.Read"], "capabilityKeys": [], "providerKeys": [], "environmentScopes": [], "disabledReasonKey": null},
  errorRefs: [],
});
