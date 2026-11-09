import { defineMutationBinding } from "../runtime/mutationRuntime";
import { subscriberStatusControllerUpdateTransportMetadata } from "./subscriberStatusControllerUpdateTransport.transport.generated";
import type { SubscriberStatusDto } from "../subscriberstatuses/types/SubscriberStatusDto.generated";import type { UpdateSubscriberStatusRequest } from "../subscriberstatuses/types/UpdateSubscriberStatusRequest.generated";
export const subscriberStatusControllerUpdateMutation = defineMutationBinding<{ id: string; body: UpdateSubscriberStatusRequest; }, SubscriberStatusDto>({
  endpointKey: "put:/api/subscriberstatuses/{id}",
  transportMetadata: subscriberStatusControllerUpdateTransportMetadata,
  invalidatesEndpointKeys: ["get:/api/subscriberstatuses", "get:/api/subscriberstatuses/lookup", "get:/api/subscriberstatuses/options/{field}", "get:/api/subscriberstatuses/suggest/{field}", "get:/api/subscriberstatuses/{id}"],
  durability: {"databaseName": "appforge-restcrud-subscriberstatus-update", "payloadSchemaVersion": 4783999644603108, "idempotencyHeaderName": "Idempotency-Key", "scopeKey": "put:/api/subscriberstatuses/{id}", "retryPolicy": {"initialDelayMs": 1500, "maxDelayMs": 30000, "multiplier": 2, "maxAttempts": 5}, "staleSendingAfterMs": 30000, "maxDeliveryAgeMs": 2419200000},
  realtimeLinks: [],
  availability: {"featureKeys": [], "policyKeys": ["SubscriberStatus.Update"], "capabilityKeys": [], "providerKeys": [], "environmentScopes": [], "disabledReasonKey": null},
  errorRefs: ["subscriber.status.idempotency_conflict", "subscriber.status.idempotency_key_invalid", "subscriber.status.idempotency_key_required", "subscriber.status.not_found", "subscriber.status.validation_failed"],
});
