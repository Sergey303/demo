import { defineQueryBinding } from "../runtime/queryRuntime";
import { subscriberControllerGetTransportMetadata } from "./subscriberControllerGetTransport.transport.generated";
import type { SubscriberDto } from "../subscribers/types/SubscriberDto.generated";
export const subscriberControllerGetQuery = defineQueryBinding<{ id: string; }, SubscriberDto>({
  endpointKey: "get:/api/subscribers/{id}",
  transportMetadata: subscriberControllerGetTransportMetadata,
  realtimeLinks: [],
  availability: {"featureKeys": [], "policyKeys": ["Subscriber.Read"], "capabilityKeys": [], "providerKeys": [], "environmentScopes": [], "disabledReasonKey": null},
  errorRefs: ["subscriber.not_found"],
});
