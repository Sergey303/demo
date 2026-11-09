import { defineMutationBinding } from "../runtime/mutationRuntime";
import { subscriberControllerUpdateTransportMetadata } from "./subscriberControllerUpdateTransport.transport.generated";
import type { SubscriberDto } from "../subscribers/types/SubscriberDto.generated";import type { UpdateSubscriberRequest } from "../subscribers/types/UpdateSubscriberRequest.generated";
export const subscriberControllerUpdateMutation = defineMutationBinding<{ id: string; body: UpdateSubscriberRequest; }, SubscriberDto>({
  endpointKey: "put:/api/subscribers/{id}",
  transportMetadata: subscriberControllerUpdateTransportMetadata,
  invalidatesEndpointKeys: ["get:/api/subscribers", "get:/api/subscribers/lookup", "get:/api/subscribers/options/{field}", "get:/api/subscribers/suggest/{field}", "get:/api/subscribers/{id}"],
  durability: {"databaseName": "appforge-restcrud-subscriber-update", "payloadSchemaVersion": 4865121986759877, "idempotencyHeaderName": "Idempotency-Key", "scopeKey": "put:/api/subscribers/{id}", "retryPolicy": {"initialDelayMs": 1500, "maxDelayMs": 30000, "multiplier": 2, "maxAttempts": 5}, "staleSendingAfterMs": 30000, "maxDeliveryAgeMs": 2419200000},
  realtimeLinks: [],
  availability: {"featureKeys": [], "policyKeys": ["Subscriber.Update"], "capabilityKeys": [], "providerKeys": [], "environmentScopes": [], "disabledReasonKey": null},
  errorRefs: ["subscriber.idempotency_conflict", "subscriber.idempotency_key_invalid", "subscriber.idempotency_key_required", "subscriber.not_found", "subscriber.validation_failed"],
});
