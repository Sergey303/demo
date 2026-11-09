import { defineQueryBinding } from "../runtime/queryRuntime";
import { subscriberStatusControllerListTransportMetadata } from "./subscriberStatusControllerListTransport.transport.generated";
import type { ListSubscriberStatusRequest } from "../subscriberstatuses/types/ListSubscriberStatusRequest.generated";import type { ListSubscriberStatusResult } from "../subscriberstatuses/types/ListSubscriberStatusResult.generated";
export const subscriberStatusControllerListQuery = defineQueryBinding<{ request: ListSubscriberStatusRequest; }, ListSubscriberStatusResult>({
  endpointKey: "get:/api/subscriberstatuses",
  transportMetadata: subscriberStatusControllerListTransportMetadata,
  realtimeLinks: [],
  availability: {"featureKeys": [], "policyKeys": ["SubscriberStatus.Read"], "capabilityKeys": [], "providerKeys": [], "environmentScopes": [], "disabledReasonKey": null},
  errorRefs: [],
});
