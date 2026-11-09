import { defineEndpointTransport } from "../runtime/transportRuntime";
import type { EndpointTransportBindingMetadata } from "../runtime/transportTypes";
import metadataJson from "./data/campaignControllerOptionsTransport.metadata.generated.json";
import type { CampaignOptionDto } from "../campaigns/types/CampaignOptionDto.generated";
export const campaignControllerOptionsTransportMetadata = metadataJson as EndpointTransportBindingMetadata;

export const campaignControllerOptionsTransport = defineEndpointTransport<{ field: string; }, CampaignOptionDto[]>(campaignControllerOptionsTransportMetadata);
