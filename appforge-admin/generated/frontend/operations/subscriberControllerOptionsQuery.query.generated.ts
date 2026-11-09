import { defineQueryBinding } from "../runtime/queryRuntime";
import { subscriberControllerOptionsTransportMetadata } from "./subscriberControllerOptionsTransport.transport.generated";
import type { SubscriberOptionDto } from "../subscribers/types/SubscriberOptionDto.generated";
export const subscriberControllerOptionsQuery = defineQueryBinding<{ field: string; }, SubscriberOptionDto[]>({
  endpointKey: "get:/api/subscribers/options/{field}",
  transportMetadata: subscriberControllerOptionsTransportMetadata,
  realtimeLinks: [],
  availability: {"featureKeys": [], "policyKeys": ["Subscriber.Read"], "capabilityKeys": [], "providerKeys": [], "environmentScopes": [], "disabledReasonKey": null},
  errorRefs: [],
});
