import { defineEndpointTransport } from "../runtime/transportRuntime";
import type { EndpointTransportBindingMetadata } from "../runtime/transportTypes";
import metadataJson from "./data/campaignStatusControllerGetTransport.metadata.generated.json";
import type { CampaignStatusDto } from "../campaignstatuses/types/CampaignStatusDto.generated";
export const campaignStatusControllerGetTransportMetadata = metadataJson as EndpointTransportBindingMetadata;

export const campaignStatusControllerGetTransport = defineEndpointTransport<{ id: string; }, CampaignStatusDto>(campaignStatusControllerGetTransportMetadata);
