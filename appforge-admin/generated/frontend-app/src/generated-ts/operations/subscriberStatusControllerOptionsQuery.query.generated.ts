import { defineQueryBinding } from "../runtime/queryRuntime";
import { subscriberStatusControllerOptionsTransportMetadata } from "./subscriberStatusControllerOptionsTransport.transport.generated";
import type { SubscriberStatusOptionDto } from "../subscriberstatuses/types/SubscriberStatusOptionDto.generated";
export const subscriberStatusControllerOptionsQuery = defineQueryBinding<{ field: string; }, SubscriberStatusOptionDto[]>({
  endpointKey: "get:/api/subscriberstatuses/options/{field}",
  transportMetadata: subscriberStatusControllerOptionsTransportMetadata,
  realtimeLinks: [],
  availability: {"featureKeys": [], "policyKeys": ["SubscriberStatus.Read"], "capabilityKeys": [], "providerKeys": [], "environmentScopes": [], "disabledReasonKey": null},
  errorRefs: [],
});
