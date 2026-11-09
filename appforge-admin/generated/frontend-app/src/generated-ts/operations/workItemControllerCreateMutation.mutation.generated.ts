import { defineMutationBinding } from "../runtime/mutationRuntime";
import { workItemControllerCreateTransportMetadata } from "./workItemControllerCreateTransport.transport.generated";
import type { CreateWorkItemRequest } from "../workitems/types/CreateWorkItemRequest.generated";import type { WorkItemDto } from "../workitems/types/WorkItemDto.generated";
export const workItemControllerCreateMutation = defineMutationBinding<CreateWorkItemRequest, WorkItemDto>({
  endpointKey: "post:/api/workitems",
  transportMetadata: workItemControllerCreateTransportMetadata,
  invalidatesEndpointKeys: ["get:/api/workitems", "get:/api/workitems/lookup", "get:/api/workitems/options/{field}", "get:/api/workitems/suggest/{field}", "get:/api/workitems/{id}"],
  durability: {"databaseName": "appforge-restcrud-workitem-create", "payloadSchemaVersion": 8119741058548340, "idempotencyHeaderName": "Idempotency-Key", "scopeKey": "post:/api/workitems", "retryPolicy": {"initialDelayMs": 1500, "maxDelayMs": 30000, "multiplier": 2, "maxAttempts": 5}, "staleSendingAfterMs": 30000, "maxDeliveryAgeMs": 2419200000},
  realtimeLinks: [],
  availability: {"featureKeys": [], "policyKeys": ["WorkItem.Create"], "capabilityKeys": [], "providerKeys": [], "environmentScopes": [], "disabledReasonKey": null},
  errorRefs: ["work.item.idempotency_conflict", "work.item.idempotency_key_invalid", "work.item.idempotency_key_required", "work.item.validation_failed"],
});
