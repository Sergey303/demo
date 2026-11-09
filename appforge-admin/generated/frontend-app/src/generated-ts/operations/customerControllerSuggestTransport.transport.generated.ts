import { defineEndpointTransport } from "../runtime/transportRuntime";
import type { EndpointTransportBindingMetadata } from "../runtime/transportTypes";
import metadataJson from "./data/customerControllerSuggestTransport.metadata.generated.json";
import type { CustomerSuggestionDto } from "../customers/types/CustomerSuggestionDto.generated";import type { SuggestCustomerRequest } from "../customers/types/SuggestCustomerRequest.generated";
export const customerControllerSuggestTransportMetadata = metadataJson as EndpointTransportBindingMetadata;

export const customerControllerSuggestTransport = defineEndpointTransport<{ field: string; request: SuggestCustomerRequest; }, CustomerSuggestionDto[]>(customerControllerSuggestTransportMetadata);
