import { defineEndpointTransport } from "../runtime/transportRuntime";
import type { EndpointTransportBindingMetadata } from "../runtime/transportTypes";
import metadataJson from "./data/campaignStatusControllerCreateTransport.metadata.generated.json";
import type { CampaignStatusDto } from "../campaignstatuses/types/CampaignStatusDto.generated";import type { CreateCampaignStatusRequest } from "../campaignstatuses/types/CreateCampaignStatusRequest.generated";
export const campaignStatusControllerCreateTransportMetadata = metadataJson as EndpointTransportBindingMetadata;

export const campaignStatusControllerCreateTransport = defineEndpointTransport<CreateCampaignStatusRequest, CampaignStatusDto>(campaignStatusControllerCreateTransportMetadata);
