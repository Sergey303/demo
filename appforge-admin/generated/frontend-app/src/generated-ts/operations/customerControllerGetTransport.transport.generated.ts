import { defineEndpointTransport } from "../runtime/transportRuntime";
import type { EndpointTransportBindingMetadata } from "../runtime/transportTypes";
import metadataJson from "./data/customerControllerGetTransport.metadata.generated.json";
import type { CustomerDto } from "../customers/types/CustomerDto.generated";
export const customerControllerGetTransportMetadata = metadataJson as EndpointTransportBindingMetadata;

export const customerControllerGetTransport = defineEndpointTransport<{ id: string; }, CustomerDto>(customerControllerGetTransportMetadata);
