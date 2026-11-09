import { defineMutationBinding } from "../runtime/mutationRuntime";
import { leadStatusControllerCreateTransportMetadata } from "./leadStatusControllerCreateTransport.transport.generated";
import type { CreateLeadStatusRequest } from "../leadstatuses/types/CreateLeadStatusRequest.generated";import type { LeadStatusDto } from "../leadstatuses/types/LeadStatusDto.generated";
export const leadStatusControllerCreateMutation = defineMutationBinding<CreateLeadStatusRequest, LeadStatusDto>({
  endpointKey: "post:/api/leadstatuses",
  transportMetadata: leadStatusControllerCreateTransportMetadata,
  invalidatesEndpointKeys: ["get:/api/leadstatuses", "get:/api/leadstatuses/lookup", "get:/api/leadstatuses/options/{field}", "get:/api/leadstatuses/suggest/{field}", "get:/api/leadstatuses/{id}"],
  durability: {"databaseName": "appforge-restcrud-leadstatus-create", "payloadSchemaVersion": 2066102131049274, "idempotencyHeaderName": "Idempotency-Key", "scopeKey": "post:/api/leadstatuses", "retryPolicy": {"initialDelayMs": 1500, "maxDelayMs": 30000, "multiplier": 2, "maxAttempts": 5}, "staleSendingAfterMs": 30000, "maxDeliveryAgeMs": 2419200000},
  realtimeLinks: [],
  availability: {"featureKeys": [], "policyKeys": ["LeadStatus.Create"], "capabilityKeys": [], "providerKeys": [], "environmentScopes": [], "disabledReasonKey": null},
  errorRefs: ["lead.status.idempotency_conflict", "lead.status.idempotency_key_invalid", "lead.status.idempotency_key_required", "lead.status.validation_failed"],
});
