import { defineMutationBinding } from "../runtime/mutationRuntime";
import { subscriberControllerDeleteTransportMetadata } from "./subscriberControllerDeleteTransport.transport.generated";

export const subscriberControllerDeleteMutation = defineMutationBinding<{ id: string; }, void>({
  endpointKey: "delete:/api/subscribers/{id}",
  transportMetadata: subscriberControllerDeleteTransportMetadata,
  invalidatesEndpointKeys: ["get:/api/subscribers", "get:/api/subscribers/lookup", "get:/api/subscribers/options/{field}", "get:/api/subscribers/suggest/{field}", "get:/api/subscribers/{id}"],
  durability: {"databaseName": "appforge-restcrud-subscriber-delete", "payloadSchemaVersion": 5777299086455972, "idempotencyHeaderName": "Idempotency-Key", "scopeKey": "delete:/api/subscribers/{id}", "retryPolicy": {"initialDelayMs": 1500, "maxDelayMs": 30000, "multiplier": 2, "maxAttempts": 5}, "staleSendingAfterMs": 30000, "maxDeliveryAgeMs": 2419200000},
  realtimeLinks: [],
  availability: {"featureKeys": [], "policyKeys": ["Subscriber.Delete"], "capabilityKeys": [], "providerKeys": [], "environmentScopes": [], "disabledReasonKey": null},
  errorRefs: ["subscriber.idempotency_conflict", "subscriber.idempotency_key_invalid", "subscriber.idempotency_key_required", "subscriber.not_found"],
});
