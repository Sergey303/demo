import { defineQueryBinding } from "../runtime/queryRuntime";
import { customerControllerSuggestTransportMetadata } from "./customerControllerSuggestTransport.transport.generated";
import type { CustomerSuggestionDto } from "../customers/types/CustomerSuggestionDto.generated";import type { SuggestCustomerRequest } from "../customers/types/SuggestCustomerRequest.generated";
export const customerControllerSuggestQuery = defineQueryBinding<{ field: string; request: SuggestCustomerRequest; }, CustomerSuggestionDto[]>({
  endpointKey: "get:/api/customers/suggest/{field}",
  transportMetadata: customerControllerSuggestTransportMetadata,
  realtimeLinks: [],
  availability: {"featureKeys": [], "policyKeys": ["Customer.Read"], "capabilityKeys": [], "providerKeys": [], "environmentScopes": [], "disabledReasonKey": null},
  errorRefs: [],
});
