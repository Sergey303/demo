import { defineEndpointTransport } from "../runtime/transportRuntime";
import type { EndpointTransportBindingMetadata } from "../runtime/transportTypes";
import metadataJson from "./data/customerControllerOptionsTransport.metadata.generated.json";
import type { CustomerOptionDto } from "../customers/types/CustomerOptionDto.generated";
export const customerControllerOptionsTransportMetadata = metadataJson as EndpointTransportBindingMetadata;

export const customerControllerOptionsTransport = defineEndpointTransport<{ field: string; }, CustomerOptionDto[]>(customerControllerOptionsTransportMetadata);
