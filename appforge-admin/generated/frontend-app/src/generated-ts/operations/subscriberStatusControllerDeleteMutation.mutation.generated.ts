import { defineMutationBinding } from "../runtime/mutationRuntime";
import { subscriberStatusControllerDeleteTransportMetadata } from "./subscriberStatusControllerDeleteTransport.transport.generated";

export const subscriberStatusControllerDeleteMutation = defineMutationBinding<{ id: string; }, void>({
  endpointKey: "delete:/api/subscriberstatuses/{id}",
  transportMetadata: subscriberStatusControllerDeleteTransportMetadata,
  invalidatesEndpointKeys: ["get:/api/subscriberstatuses", "get:/api/subscriberstatuses/lookup", "get:/api/subscriberstatuses/options/{field}", "get:/api/subscriberstatuses/suggest/{field}", "get:/api/subscriberstatuses/{id}"],
  durability: {"databaseName": "appforge-restcrud-subscriberstatus-delete", "payloadSchemaVersion": 1702057406661458, "idempotencyHeaderName": "Idempotency-Key", "scopeKey": "delete:/api/subscriberstatuses/{id}", "retryPolicy": {"initialDelayMs": 1500, "maxDelayMs": 30000, "multiplier": 2, "maxAttempts": 5}, "staleSendingAfterMs": 30000, "maxDeliveryAgeMs": 2419200000},
  realtimeLinks: [],
  availability: {"featureKeys": [], "policyKeys": ["SubscriberStatus.Delete"], "capabilityKeys": [], "providerKeys": [], "environmentScopes": [], "disabledReasonKey": null},
  errorRefs: ["subscriber.status.idempotency_conflict", "subscriber.status.idempotency_key_invalid", "subscriber.status.idempotency_key_required", "subscriber.status.not_found"],
});
