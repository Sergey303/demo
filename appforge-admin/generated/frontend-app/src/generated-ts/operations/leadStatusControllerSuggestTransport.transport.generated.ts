import { defineEndpointTransport } from "../runtime/transportRuntime";
import type { EndpointTransportBindingMetadata } from "../runtime/transportTypes";
import metadataJson from "./data/leadStatusControllerSuggestTransport.metadata.generated.json";
import type { LeadStatusSuggestionDto } from "../leadstatuses/types/LeadStatusSuggestionDto.generated";import type { SuggestLeadStatusRequest } from "../leadstatuses/types/SuggestLeadStatusRequest.generated";
export const leadStatusControllerSuggestTransportMetadata = metadataJson as EndpointTransportBindingMetadata;

export const leadStatusControllerSuggestTransport = defineEndpointTransport<{ field: string; request: SuggestLeadStatusRequest; }, LeadStatusSuggestionDto[]>(leadStatusControllerSuggestTransportMetadata);
