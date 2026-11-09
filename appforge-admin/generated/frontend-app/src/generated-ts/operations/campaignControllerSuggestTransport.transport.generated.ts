import { defineEndpointTransport } from "../runtime/transportRuntime";
import type { EndpointTransportBindingMetadata } from "../runtime/transportTypes";
import metadataJson from "./data/campaignControllerSuggestTransport.metadata.generated.json";
import type { CampaignSuggestionDto } from "../campaigns/types/CampaignSuggestionDto.generated";import type { SuggestCampaignRequest } from "../campaigns/types/SuggestCampaignRequest.generated";
export const campaignControllerSuggestTransportMetadata = metadataJson as EndpointTransportBindingMetadata;

export const campaignControllerSuggestTransport = defineEndpointTransport<{ field: string; request: SuggestCampaignRequest; }, CampaignSuggestionDto[]>(campaignControllerSuggestTransportMetadata);
