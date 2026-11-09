import { defineEndpointTransport } from "../runtime/transportRuntime";
import type { EndpointTransportBindingMetadata } from "../runtime/transportTypes";
import metadataJson from "./data/campaignControllerGetTransport.metadata.generated.json";
import type { CampaignDto } from "../campaigns/types/CampaignDto.generated";
export const campaignControllerGetTransportMetadata = metadataJson as EndpointTransportBindingMetadata;

export const campaignControllerGetTransport = defineEndpointTransport<{ id: string; }, CampaignDto>(campaignControllerGetTransportMetadata);
