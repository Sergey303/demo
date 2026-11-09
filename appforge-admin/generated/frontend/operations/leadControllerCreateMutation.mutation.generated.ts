import { defineMutationBinding } from "../runtime/mutationRuntime";
import { leadControllerCreateTransportMetadata } from "./leadControllerCreateTransport.transport.generated";
import type { CreateLeadRequest } from "../leads/types/CreateLeadRequest.generated";import type { LeadDto } from "../leads/types/LeadDto.generated";
export const leadControllerCreateMutation = defineMutationBinding<CreateLeadRequest, LeadDto>({
  endpointKey: "post:/api/leads",
  transportMetadata: leadControllerCreateTransportMetadata,
  invalidatesEndpointKeys: ["get:/api/leads", "get:/api/leads/lookup", "get:/api/leads/options/{field}", "get:/api/leads/suggest/{field}", "get:/api/leads/{id}"],
  durability: {"databaseName": "appforge-restcrud-lead-create", "payloadSchemaVersion": 5140357150317514, "idempotencyHeaderName": "Idempotency-Key", "scopeKey": "post:/api/leads", "retryPolicy": {"initialDelayMs": 1500, "maxDelayMs": 30000, "multiplier": 2, "maxAttempts": 5}, "staleSendingAfterMs": 30000, "maxDeliveryAgeMs": 2419200000},
  realtimeLinks: [],
  availability: {"featureKeys": [], "policyKeys": ["Lead.Create"], "capabilityKeys": [], "providerKeys": [], "environmentScopes": [], "disabledReasonKey": null},
  errorRefs: ["lead.idempotency_conflict", "lead.idempotency_key_invalid", "lead.idempotency_key_required", "lead.validation_failed"],
});
