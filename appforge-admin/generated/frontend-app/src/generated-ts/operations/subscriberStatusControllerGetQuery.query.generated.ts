import { defineQueryBinding } from "../runtime/queryRuntime";
import { subscriberStatusControllerGetTransportMetadata } from "./subscriberStatusControllerGetTransport.transport.generated";
import type { SubscriberStatusDto } from "../subscriberstatuses/types/SubscriberStatusDto.generated";
export const subscriberStatusControllerGetQuery = defineQueryBinding<{ id: string; }, SubscriberStatusDto>({
  endpointKey: "get:/api/subscriberstatuses/{id}",
  transportMetadata: subscriberStatusControllerGetTransportMetadata,
  realtimeLinks: [],
  availability: {"featureKeys": [], "policyKeys": ["SubscriberStatus.Read"], "capabilityKeys": [], "providerKeys": [], "environmentScopes": [], "disabledReasonKey": null},
  errorRefs: ["subscriber.status.not_found"],
});
