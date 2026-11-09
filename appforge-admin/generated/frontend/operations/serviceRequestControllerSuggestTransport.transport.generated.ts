import { defineEndpointTransport } from "../runtime/transportRuntime";
import type { EndpointTransportBindingMetadata } from "../runtime/transportTypes";
import metadataJson from "./data/serviceRequestControllerSuggestTransport.metadata.generated.json";
import type { ServiceRequestSuggestionDto } from "../servicerequests/types/ServiceRequestSuggestionDto.generated";import type { SuggestServiceRequestRequest } from "../servicerequests/types/SuggestServiceRequestRequest.generated";
export const serviceRequestControllerSuggestTransportMetadata = metadataJson as EndpointTransportBindingMetadata;

export const serviceRequestControllerSuggestTransport = defineEndpointTransport<{ field: string; request: SuggestServiceRequestRequest; }, ServiceRequestSuggestionDto[]>(serviceRequestControllerSuggestTransportMetadata);
