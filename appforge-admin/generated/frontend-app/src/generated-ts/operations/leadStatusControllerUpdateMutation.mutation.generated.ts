import { defineMutationBinding } from "../runtime/mutationRuntime";
import { leadStatusControllerUpdateTransportMetadata } from "./leadStatusControllerUpdateTransport.transport.generated";
import type { LeadStatusDto } from "../leadstatuses/types/LeadStatusDto.generated";import type { UpdateLeadStatusRequest } from "../leadstatuses/types/UpdateLeadStatusRequest.generated";
export const leadStatusControllerUpdateMutation = defineMutationBinding<{ id: string; body: UpdateLeadStatusRequest; }, LeadStatusDto>({
  endpointKey: "put:/api/leadstatuses/{id}",
  transportMetadata: leadStatusControllerUpdateTransportMetadata,
  invalidatesEndpointKeys: ["get:/api/leadstatuses", "get:/api/leadstatuses/lookup", "get:/api/leadstatuses/options/{field}", "get:/api/leadstatuses/suggest/{field}", "get:/api/leadstatuses/{id}"],
  durability: {"databaseName": "appforge-restcrud-leadstatus-update", "payloadSchemaVersion": 4223245746119504, "idempotencyHeaderName": "Idempotency-Key", "scopeKey": "put:/api/leadstatuses/{id}", "retryPolicy": {"initialDelayMs": 1500, "maxDelayMs": 30000, "multiplier": 2, "maxAttempts": 5}, "staleSendingAfterMs": 30000, "maxDeliveryAgeMs": 2419200000},
  realtimeLinks: [],
  availability: {"featureKeys": [], "policyKeys": ["LeadStatus.Update"], "capabilityKeys": [], "providerKeys": [], "environmentScopes": [], "disabledReasonKey": null},
  errorRefs: ["lead.status.idempotency_conflict", "lead.status.idempotency_key_invalid", "lead.status.idempotency_key_required", "lead.status.not_found", "lead.status.validation_failed"],
});
