import { defineEndpointTransport } from "../runtime/transportRuntime";
import type { EndpointTransportBindingMetadata } from "../runtime/transportTypes";
import metadataJson from "./data/serviceRequestControllerGetTransport.metadata.generated.json";
import type { ServiceRequestDto } from "../servicerequests/types/ServiceRequestDto.generated";
export const serviceRequestControllerGetTransportMetadata = metadataJson as EndpointTransportBindingMetadata;

export const serviceRequestControllerGetTransport = defineEndpointTransport<{ id: string; }, ServiceRequestDto>(serviceRequestControllerGetTransportMetadata);
