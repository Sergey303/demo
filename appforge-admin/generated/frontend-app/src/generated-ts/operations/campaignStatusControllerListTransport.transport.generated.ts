import { defineEndpointTransport } from "../runtime/transportRuntime";
import type { EndpointTransportBindingMetadata } from "../runtime/transportTypes";
import metadataJson from "./data/campaignStatusControllerListTransport.metadata.generated.json";
import type { ListCampaignStatusRequest } from "../campaignstatuses/types/ListCampaignStatusRequest.generated";import type { ListCampaignStatusResult } from "../campaignstatuses/types/ListCampaignStatusResult.generated";
export const campaignStatusControllerListTransportMetadata = metadataJson as EndpointTransportBindingMetadata;

export const campaignStatusControllerListTransport = defineEndpointTransport<{ request: ListCampaignStatusRequest; }, ListCampaignStatusResult>(campaignStatusControllerListTransportMetadata);
