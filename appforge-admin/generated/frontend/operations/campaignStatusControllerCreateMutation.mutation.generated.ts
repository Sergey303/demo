import { defineMutationBinding } from "../runtime/mutationRuntime";
import { campaignStatusControllerCreateTransportMetadata } from "./campaignStatusControllerCreateTransport.transport.generated";
import type { CampaignStatusDto } from "../campaignstatuses/types/CampaignStatusDto.generated";import type { CreateCampaignStatusRequest } from "../campaignstatuses/types/CreateCampaignStatusRequest.generated";
export const campaignStatusControllerCreateMutation = defineMutationBinding<CreateCampaignStatusRequest, CampaignStatusDto>({
  endpointKey: "post:/api/campaignstatuses",
  transportMetadata: campaignStatusControllerCreateTransportMetadata,
  invalidatesEndpointKeys: ["get:/api/campaignstatuses", "get:/api/campaignstatuses/lookup", "get:/api/campaignstatuses/options/{field}", "get:/api/campaignstatuses/suggest/{field}", "get:/api/campaignstatuses/{id}"],
  durability: {"databaseName": "appforge-restcrud-campaignstatus-create", "payloadSchemaVersion": 2083179688592838, "idempotencyHeaderName": "Idempotency-Key", "scopeKey": "post:/api/campaignstatuses", "retryPolicy": {"initialDelayMs": 1500, "maxDelayMs": 30000, "multiplier": 2, "maxAttempts": 5}, "staleSendingAfterMs": 30000, "maxDeliveryAgeMs": 2419200000},
  realtimeLinks: [],
  availability: {"featureKeys": [], "policyKeys": ["CampaignStatus.Create"], "capabilityKeys": [], "providerKeys": [], "environmentScopes": [], "disabledReasonKey": null},
  errorRefs: ["campaign.status.idempotency_conflict", "campaign.status.idempotency_key_invalid", "campaign.status.idempotency_key_required", "campaign.status.validation_failed"],
});
