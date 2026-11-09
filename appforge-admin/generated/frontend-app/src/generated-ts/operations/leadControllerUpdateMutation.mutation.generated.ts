import { defineMutationBinding } from "../runtime/mutationRuntime";
import { leadControllerUpdateTransportMetadata } from "./leadControllerUpdateTransport.transport.generated";
import type { LeadDto } from "../leads/types/LeadDto.generated";import type { UpdateLeadRequest } from "../leads/types/UpdateLeadRequest.generated";
export const leadControllerUpdateMutation = defineMutationBinding<{ id: string; body: UpdateLeadRequest; }, LeadDto>({
  endpointKey: "put:/api/leads/{id}",
  transportMetadata: leadControllerUpdateTransportMetadata,
  invalidatesEndpointKeys: ["get:/api/leads", "get:/api/leads/lookup", "get:/api/leads/options/{field}", "get:/api/leads/suggest/{field}", "get:/api/leads/{id}"],
  durability: {"databaseName": "appforge-restcrud-lead-update", "payloadSchemaVersion": 6634163577908658, "idempotencyHeaderName": "Idempotency-Key", "scopeKey": "put:/api/leads/{id}", "retryPolicy": {"initialDelayMs": 1500, "maxDelayMs": 30000, "multiplier": 2, "maxAttempts": 5}, "staleSendingAfterMs": 30000, "maxDeliveryAgeMs": 2419200000},
  realtimeLinks: [],
  availability: {"featureKeys": [], "policyKeys": ["Lead.Update"], "capabilityKeys": [], "providerKeys": [], "environmentScopes": [], "disabledReasonKey": null},
  errorRefs: ["lead.idempotency_conflict", "lead.idempotency_key_invalid", "lead.idempotency_key_required", "lead.not_found", "lead.validation_failed"],
});
