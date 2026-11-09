import { defineEndpointTransport } from "../runtime/transportRuntime";
import type { EndpointTransportBindingMetadata } from "../runtime/transportTypes";
import metadataJson from "./data/customerControllerLookupTransport.metadata.generated.json";
import type { CustomerLookupDto } from "../customers/types/CustomerLookupDto.generated";import type { LookupCustomerRequest } from "../customers/types/LookupCustomerRequest.generated";
export const customerControllerLookupTransportMetadata = metadataJson as EndpointTransportBindingMetadata;

export const customerControllerLookupTransport = defineEndpointTransport<{ request: LookupCustomerRequest; }, CustomerLookupDto[]>(customerControllerLookupTransportMetadata);
