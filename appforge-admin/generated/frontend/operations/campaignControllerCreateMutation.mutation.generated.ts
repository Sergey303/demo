import { defineMutationBinding } from "../runtime/mutationRuntime";
import { campaignControllerCreateTransportMetadata } from "./campaignControllerCreateTransport.transport.generated";
import type { CampaignDto } from "../campaigns/types/CampaignDto.generated";import type { CreateCampaignRequest } from "../campaigns/types/CreateCampaignRequest.generated";
export const campaignControllerCreateMutation = defineMutationBinding<CreateCampaignRequest, CampaignDto>({
  endpointKey: "post:/api/campaigns",
  transportMetadata: campaignControllerCreateTransportMetadata,
  invalidatesEndpointKeys: ["get:/api/campaigns", "get:/api/campaigns/lookup", "get:/api/campaigns/options/{field}", "get:/api/campaigns/suggest/{field}", "get:/api/campaigns/{id}"],
  durability: {"databaseName": "appforge-restcrud-campaign-create", "payloadSchemaVersion": 8697053003713017, "idempotencyHeaderName": "Idempotency-Key", "scopeKey": "post:/api/campaigns", "retryPolicy": {"initialDelayMs": 1500, "maxDelayMs": 30000, "multiplier": 2, "maxAttempts": 5}, "staleSendingAfterMs": 30000, "maxDeliveryAgeMs": 2419200000},
  realtimeLinks: [],
  availability: {"featureKeys": [], "policyKeys": ["Campaign.Create"], "capabilityKeys": [], "providerKeys": [], "environmentScopes": [], "disabledReasonKey": null},
  errorRefs: ["campaign.idempotency_conflict", "campaign.idempotency_key_invalid", "campaign.idempotency_key_required", "campaign.validation_failed"],
});
