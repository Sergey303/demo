import { defineEndpointTransport } from "../runtime/transportRuntime";
import type { EndpointTransportBindingMetadata } from "../runtime/transportTypes";
import metadataJson from "./data/campaignStatusControllerLookupTransport.metadata.generated.json";
import type { CampaignStatusLookupDto } from "../campaignstatuses/types/CampaignStatusLookupDto.generated";import type { LookupCampaignStatusRequest } from "../campaignstatuses/types/LookupCampaignStatusRequest.generated";
export const campaignStatusControllerLookupTransportMetadata = metadataJson as EndpointTransportBindingMetadata;

export const campaignStatusControllerLookupTransport = defineEndpointTransport<{ request: LookupCampaignStatusRequest; }, CampaignStatusLookupDto[]>(campaignStatusControllerLookupTransportMetadata);
