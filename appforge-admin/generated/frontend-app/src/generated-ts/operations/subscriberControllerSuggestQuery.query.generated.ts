import { defineQueryBinding } from "../runtime/queryRuntime";
import { subscriberControllerSuggestTransportMetadata } from "./subscriberControllerSuggestTransport.transport.generated";
import type { SubscriberSuggestionDto } from "../subscribers/types/SubscriberSuggestionDto.generated";import type { SuggestSubscriberRequest } from "../subscribers/types/SuggestSubscriberRequest.generated";
export const subscriberControllerSuggestQuery = defineQueryBinding<{ field: string; request: SuggestSubscriberRequest; }, SubscriberSuggestionDto[]>({
  endpointKey: "get:/api/subscribers/suggest/{field}",
  transportMetadata: subscriberControllerSuggestTransportMetadata,
  realtimeLinks: [],
  availability: {"featureKeys": [], "policyKeys": ["Subscriber.Read"], "capabilityKeys": [], "providerKeys": [], "environmentScopes": [], "disabledReasonKey": null},
  errorRefs: [],
});
