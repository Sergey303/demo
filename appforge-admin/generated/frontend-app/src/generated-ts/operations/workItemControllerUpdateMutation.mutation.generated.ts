import { defineMutationBinding } from "../runtime/mutationRuntime";
import { workItemControllerUpdateTransportMetadata } from "./workItemControllerUpdateTransport.transport.generated";
import type { UpdateWorkItemRequest } from "../workitems/types/UpdateWorkItemRequest.generated";import type { WorkItemDto } from "../workitems/types/WorkItemDto.generated";
export const workItemControllerUpdateMutation = defineMutationBinding<{ id: string; body: UpdateWorkItemRequest; }, WorkItemDto>({
  endpointKey: "put:/api/workitems/{id}",
  transportMetadata: workItemControllerUpdateTransportMetadata,
  invalidatesEndpointKeys: ["get:/api/workitems", "get:/api/workitems/lookup", "get:/api/workitems/options/{field}", "get:/api/workitems/suggest/{field}", "get:/api/workitems/{id}"],
  durability: {"databaseName": "appforge-restcrud-workitem-update", "payloadSchemaVersion": 995073513483649, "idempotencyHeaderName": "Idempotency-Key", "scopeKey": "put:/api/workitems/{id}", "retryPolicy": {"initialDelayMs": 1500, "maxDelayMs": 30000, "multiplier": 2, "maxAttempts": 5}, "staleSendingAfterMs": 30000, "maxDeliveryAgeMs": 2419200000},
  realtimeLinks: [],
  availability: {"featureKeys": [], "policyKeys": ["WorkItem.Update"], "capabilityKeys": [], "providerKeys": [], "environmentScopes": [], "disabledReasonKey": null},
  errorRefs: ["work.item.idempotency_conflict", "work.item.idempotency_key_invalid", "work.item.idempotency_key_required", "work.item.not_found", "work.item.validation_failed"],
});
