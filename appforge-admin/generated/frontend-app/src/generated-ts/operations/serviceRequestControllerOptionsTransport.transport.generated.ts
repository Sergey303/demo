import { defineEndpointTransport } from "../runtime/transportRuntime";
import type { EndpointTransportBindingMetadata } from "../runtime/transportTypes";
import metadataJson from "./data/serviceRequestControllerOptionsTransport.metadata.generated.json";
import type { ServiceRequestOptionDto } from "../servicerequests/types/ServiceRequestOptionDto.generated";
export const serviceRequestControllerOptionsTransportMetadata = metadataJson as EndpointTransportBindingMetadata;

export const serviceRequestControllerOptionsTransport = defineEndpointTransport<{ field: string; }, ServiceRequestOptionDto[]>(serviceRequestControllerOptionsTransportMetadata);
