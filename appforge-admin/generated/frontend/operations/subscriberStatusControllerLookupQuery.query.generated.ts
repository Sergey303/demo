import { defineQueryBinding } from "../runtime/queryRuntime";
import { subscriberStatusControllerLookupTransportMetadata } from "./subscriberStatusControllerLookupTransport.transport.generated";
import type { LookupSubscriberStatusRequest } from "../subscriberstatuses/types/LookupSubscriberStatusRequest.generated";import type { SubscriberStatusLookupDto } from "../subscriberstatuses/types/SubscriberStatusLookupDto.generated";
export const subscriberStatusControllerLookupQuery = defineQueryBinding<{ request: LookupSubscriberStatusRequest; }, SubscriberStatusLookupDto[]>({
  endpointKey: "get:/api/subscriberstatuses/lookup",
  transportMetadata: subscriberStatusControllerLookupTransportMetadata,
  realtimeLinks: [],
  availability: {"featureKeys": [], "policyKeys": ["SubscriberStatus.Read"], "capabilityKeys": [], "providerKeys": [], "environmentScopes": [], "disabledReasonKey": null},
  errorRefs: [],
});
