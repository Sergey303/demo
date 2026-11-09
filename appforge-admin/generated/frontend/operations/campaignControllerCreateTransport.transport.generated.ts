import { defineEndpointTransport } from "../runtime/transportRuntime";
import type { EndpointTransportBindingMetadata } from "../runtime/transportTypes";
import metadataJson from "./data/campaignControllerCreateTransport.metadata.generated.json";
import type { CampaignDto } from "../campaigns/types/CampaignDto.generated";import type { CreateCampaignRequest } from "../campaigns/types/CreateCampaignRequest.generated";
export const campaignControllerCreateTransportMetadata = metadataJson as EndpointTransportBindingMetadata;

export const campaignControllerCreateTransport = defineEndpointTransport<CreateCampaignRequest, CampaignDto>(campaignControllerCreateTransportMetadata);
