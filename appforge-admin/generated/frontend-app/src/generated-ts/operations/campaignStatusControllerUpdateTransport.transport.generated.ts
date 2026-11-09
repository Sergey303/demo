import { defineEndpointTransport } from "../runtime/transportRuntime";
import type { EndpointTransportBindingMetadata } from "../runtime/transportTypes";
import metadataJson from "./data/campaignStatusControllerUpdateTransport.metadata.generated.json";
import type { CampaignStatusDto } from "../campaignstatuses/types/CampaignStatusDto.generated";import type { UpdateCampaignStatusRequest } from "../campaignstatuses/types/UpdateCampaignStatusRequest.generated";
export const campaignStatusControllerUpdateTransportMetadata = metadataJson as EndpointTransportBindingMetadata;

export const campaignStatusControllerUpdateTransport = defineEndpointTransport<{ id: string; body: UpdateCampaignStatusRequest; }, CampaignStatusDto>(campaignStatusControllerUpdateTransportMetadata);
