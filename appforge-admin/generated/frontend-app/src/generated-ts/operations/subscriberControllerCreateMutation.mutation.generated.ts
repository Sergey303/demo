import { defineMutationBinding } from "../runtime/mutationRuntime";
import { subscriberControllerCreateTransportMetadata } from "./subscriberControllerCreateTransport.transport.generated";
import type { CreateSubscriberRequest } from "../subscribers/types/CreateSubscriberRequest.generated";import type { SubscriberDto } from "../subscribers/types/SubscriberDto.generated";
export const subscriberControllerCreateMutation = defineMutationBinding<CreateSubscriberRequest, SubscriberDto>({
  endpointKey: "post:/api/subscribers",
  transportMetadata: subscriberControllerCreateTransportMetadata,
  invalidatesEndpointKeys: ["get:/api/subscribers", "get:/api/subscribers/lookup", "get:/api/subscribers/options/{field}", "get:/api/subscribers/suggest/{field}", "get:/api/subscribers/{id}"],
  durability: {"databaseName": "appforge-restcrud-subscriber-create", "payloadSchemaVersion": 4317675464731295, "idempotencyHeaderName": "Idempotency-Key", "scopeKey": "post:/api/subscribers", "retryPolicy": {"initialDelayMs": 1500, "maxDelayMs": 30000, "multiplier": 2, "maxAttempts": 5}, "staleSendingAfterMs": 30000, "maxDeliveryAgeMs": 2419200000},
  realtimeLinks: [],
  availability: {"featureKeys": [], "policyKeys": ["Subscriber.Create"], "capabilityKeys": [], "providerKeys": [], "environmentScopes": [], "disabledReasonKey": null},
  errorRefs: ["subscriber.idempotency_conflict", "subscriber.idempotency_key_invalid", "subscriber.idempotency_key_required", "subscriber.validation_failed"],
});
