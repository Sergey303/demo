import { defineEndpointTransport } from "../runtime/transportRuntime";
import type { EndpointTransportBindingMetadata } from "../runtime/transportTypes";
import metadataJson from "./data/campaignControllerUpdateTransport.metadata.generated.json";
import type { CampaignDto } from "../campaigns/types/CampaignDto.generated";import type { UpdateCampaignRequest } from "../campaigns/types/UpdateCampaignRequest.generated";
export const campaignControllerUpdateTransportMetadata = metadataJson as EndpointTransportBindingMetadata;

export const campaignControllerUpdateTransport = defineEndpointTransport<{ id: string; body: UpdateCampaignRequest; }, CampaignDto>(campaignControllerUpdateTransportMetadata);
