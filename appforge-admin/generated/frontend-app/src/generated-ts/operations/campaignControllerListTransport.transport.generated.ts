import { defineEndpointTransport } from "../runtime/transportRuntime";
import type { EndpointTransportBindingMetadata } from "../runtime/transportTypes";
import metadataJson from "./data/campaignControllerListTransport.metadata.generated.json";
import type { ListCampaignRequest } from "../campaigns/types/ListCampaignRequest.generated";import type { ListCampaignResult } from "../campaigns/types/ListCampaignResult.generated";
export const campaignControllerListTransportMetadata = metadataJson as EndpointTransportBindingMetadata;

export const campaignControllerListTransport = defineEndpointTransport<{ request: ListCampaignRequest; }, ListCampaignResult>(campaignControllerListTransportMetadata);
