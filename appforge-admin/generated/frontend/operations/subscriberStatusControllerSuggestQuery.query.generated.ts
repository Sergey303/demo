import { defineQueryBinding } from "../runtime/queryRuntime";
import { subscriberStatusControllerSuggestTransportMetadata } from "./subscriberStatusControllerSuggestTransport.transport.generated";
import type { SubscriberStatusSuggestionDto } from "../subscriberstatuses/types/SubscriberStatusSuggestionDto.generated";import type { SuggestSubscriberStatusRequest } from "../subscriberstatuses/types/SuggestSubscriberStatusRequest.generated";
export const subscriberStatusControllerSuggestQuery = defineQueryBinding<{ field: string; request: SuggestSubscriberStatusRequest; }, SubscriberStatusSuggestionDto[]>({
  endpointKey: "get:/api/subscriberstatuses/suggest/{field}",
  transportMetadata: subscriberStatusControllerSuggestTransportMetadata,
  realtimeLinks: [],
  availability: {"featureKeys": [], "policyKeys": ["SubscriberStatus.Read"], "capabilityKeys": [], "providerKeys": [], "environmentScopes": [], "disabledReasonKey": null},
  errorRefs: [],
});
