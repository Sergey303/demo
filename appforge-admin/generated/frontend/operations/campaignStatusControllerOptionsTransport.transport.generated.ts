import { defineEndpointTransport } from "../runtime/transportRuntime";
import type { EndpointTransportBindingMetadata } from "../runtime/transportTypes";
import metadataJson from "./data/campaignStatusControllerOptionsTransport.metadata.generated.json";
import type { CampaignStatusOptionDto } from "../campaignstatuses/types/CampaignStatusOptionDto.generated";
export const campaignStatusControllerOptionsTransportMetadata = metadataJson as EndpointTransportBindingMetadata;

export const campaignStatusControllerOptionsTransport = defineEndpointTransport<{ field: string; }, CampaignStatusOptionDto[]>(campaignStatusControllerOptionsTransportMetadata);
