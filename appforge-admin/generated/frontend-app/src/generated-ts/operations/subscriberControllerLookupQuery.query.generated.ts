import { defineQueryBinding } from "../runtime/queryRuntime";
import { subscriberControllerLookupTransportMetadata } from "./subscriberControllerLookupTransport.transport.generated";
import type { LookupSubscriberRequest } from "../subscribers/types/LookupSubscriberRequest.generated";import type { SubscriberLookupDto } from "../subscribers/types/SubscriberLookupDto.generated";
export const subscriberControllerLookupQuery = defineQueryBinding<{ request: LookupSubscriberRequest; }, SubscriberLookupDto[]>({
  endpointKey: "get:/api/subscribers/lookup",
  transportMetadata: subscriberControllerLookupTransportMetadata,
  realtimeLinks: [],
  availability: {"featureKeys": [], "policyKeys": ["Subscriber.Read"], "capabilityKeys": [], "providerKeys": [], "environmentScopes": [], "disabledReasonKey": null},
  errorRefs: [],
});
