import { defineMutationBinding } from "../runtime/mutationRuntime";
import { workItemControllerDeleteTransportMetadata } from "./workItemControllerDeleteTransport.transport.generated";

export const workItemControllerDeleteMutation = defineMutationBinding<{ id: string; }, void>({
  endpointKey: "delete:/api/workitems/{id}",
  transportMetadata: workItemControllerDeleteTransportMetadata,
  invalidatesEndpointKeys: ["get:/api/workitems", "get:/api/workitems/lookup", "get:/api/workitems/options/{field}", "get:/api/workitems/suggest/{field}", "get:/api/workitems/{id}"],
  durability: {"databaseName": "appforge-restcrud-workitem-delete", "payloadSchemaVersion": 5821870639768304, "idempotencyHeaderName": "Idempotency-Key", "scopeKey": "delete:/api/workitems/{id}", "retryPolicy": {"initialDelayMs": 1500, "maxDelayMs": 30000, "multiplier": 2, "maxAttempts": 5}, "staleSendingAfterMs": 30000, "maxDeliveryAgeMs": 2419200000},
  realtimeLinks: [],
  availability: {"featureKeys": [], "policyKeys": ["WorkItem.Delete"], "capabilityKeys": [], "providerKeys": [], "environmentScopes": [], "disabledReasonKey": null},
  errorRefs: ["work.item.idempotency_conflict", "work.item.idempotency_key_invalid", "work.item.idempotency_key_required", "work.item.not_found"],
});
