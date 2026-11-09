import { defineEndpointTransport } from "../runtime/transportRuntime";
import type { EndpointTransportBindingMetadata } from "../runtime/transportTypes";
import metadataJson from "./data/leadControllerSuggestTransport.metadata.generated.json";
import type { LeadSuggestionDto } from "../leads/types/LeadSuggestionDto.generated";import type { SuggestLeadRequest } from "../leads/types/SuggestLeadRequest.generated";
export const leadControllerSuggestTransportMetadata = metadataJson as EndpointTransportBindingMetadata;

export const leadControllerSuggestTransport = defineEndpointTransport<{ field: string; request: SuggestLeadRequest; }, LeadSuggestionDto[]>(leadControllerSuggestTransportMetadata);
