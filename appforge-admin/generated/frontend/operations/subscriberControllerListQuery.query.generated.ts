import { defineQueryBinding } from "../runtime/queryRuntime";
import { subscriberControllerListTransportMetadata } from "./subscriberControllerListTransport.transport.generated";
import type { ListSubscriberRequest } from "../subscribers/types/ListSubscriberRequest.generated";import type { ListSubscriberResult } from "../subscribers/types/ListSubscriberResult.generated";
export const subscriberControllerListQuery = defineQueryBinding<{ request: ListSubscriberRequest; }, ListSubscriberResult>({
  endpointKey: "get:/api/subscribers",
  transportMetadata: subscriberControllerListTransportMetadata,
  realtimeLinks: [],
  availability: {"featureKeys": [], "policyKeys": ["Subscriber.Read"], "capabilityKeys": [], "providerKeys": [], "environmentScopes": [], "disabledReasonKey": null},
  errorRefs: [],
});
