import { defineEndpointTransport } from "../runtime/transportRuntime";
import type { EndpointTransportBindingMetadata } from "../runtime/transportTypes";
import metadataJson from "./data/campaignControllerLookupTransport.metadata.generated.json";
import type { CampaignLookupDto } from "../campaigns/types/CampaignLookupDto.generated";import type { LookupCampaignRequest } from "../campaigns/types/LookupCampaignRequest.generated";
export const campaignControllerLookupTransportMetadata = metadataJson as EndpointTransportBindingMetadata;

export const campaignControllerLookupTransport = defineEndpointTransport<{ request: LookupCampaignRequest; }, CampaignLookupDto[]>(campaignControllerLookupTransportMetadata);
