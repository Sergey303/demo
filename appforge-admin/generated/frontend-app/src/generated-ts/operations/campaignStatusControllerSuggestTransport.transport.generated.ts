import { defineEndpointTransport } from "../runtime/transportRuntime";
import type { EndpointTransportBindingMetadata } from "../runtime/transportTypes";
import metadataJson from "./data/campaignStatusControllerSuggestTransport.metadata.generated.json";
import type { CampaignStatusSuggestionDto } from "../campaignstatuses/types/CampaignStatusSuggestionDto.generated";import type { SuggestCampaignStatusRequest } from "../campaignstatuses/types/SuggestCampaignStatusRequest.generated";
export const campaignStatusControllerSuggestTransportMetadata = metadataJson as EndpointTransportBindingMetadata;

export const campaignStatusControllerSuggestTransport = defineEndpointTransport<{ field: string; request: SuggestCampaignStatusRequest; }, CampaignStatusSuggestionDto[]>(campaignStatusControllerSuggestTransportMetadata);
