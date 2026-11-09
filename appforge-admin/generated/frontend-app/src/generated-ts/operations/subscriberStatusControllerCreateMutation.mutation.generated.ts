import { defineMutationBinding } from "../runtime/mutationRuntime";
import { subscriberStatusControllerCreateTransportMetadata } from "./subscriberStatusControllerCreateTransport.transport.generated";
import type { CreateSubscriberStatusRequest } from "../subscriberstatuses/types/CreateSubscriberStatusRequest.generated";import type { SubscriberStatusDto } from "../subscriberstatuses/types/SubscriberStatusDto.generated";
export const subscriberStatusControllerCreateMutation = defineMutationBinding<CreateSubscriberStatusRequest, SubscriberStatusDto>({
  endpointKey: "post:/api/subscriberstatuses",
  transportMetadata: subscriberStatusControllerCreateTransportMetadata,
  invalidatesEndpointKeys: ["get:/api/subscriberstatuses", "get:/api/subscriberstatuses/lookup", "get:/api/subscriberstatuses/options/{field}", "get:/api/subscriberstatuses/suggest/{field}", "get:/api/subscriberstatuses/{id}"],
  durability: {"databaseName": "appforge-restcrud-subscriberstatus-create", "payloadSchemaVersion": 3156655866792480, "idempotencyHeaderName": "Idempotency-Key", "scopeKey": "post:/api/subscriberstatuses", "retryPolicy": {"initialDelayMs": 1500, "maxDelayMs": 30000, "multiplier": 2, "maxAttempts": 5}, "staleSendingAfterMs": 30000, "maxDeliveryAgeMs": 2419200000},
  realtimeLinks: [],
  availability: {"featureKeys": [], "policyKeys": ["SubscriberStatus.Create"], "capabilityKeys": [], "providerKeys": [], "environmentScopes": [], "disabledReasonKey": null},
  errorRefs: ["subscriber.status.idempotency_conflict", "subscriber.status.idempotency_key_invalid", "subscriber.status.idempotency_key_required", "subscriber.status.validation_failed"],
});
