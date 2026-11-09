import { defineEndpointTransport } from "../runtime/transportRuntime";
import type { EndpointTransportBindingMetadata } from "../runtime/transportTypes";
import metadataJson from "./data/serviceRequestControllerUpdateTransport.metadata.generated.json";
import type { ServiceRequestDto } from "../servicerequests/types/ServiceRequestDto.generated";import type { UpdateServiceRequestRequest } from "../servicerequests/types/UpdateServiceRequestRequest.generated";
export const serviceRequestControllerUpdateTransportMetadata = metadataJson as EndpointTransportBindingMetadata;

export const serviceRequestControllerUpdateTransport = defineEndpointTransport<{ id: string; body: UpdateServiceRequestRequest; }, ServiceRequestDto>(serviceRequestControllerUpdateTransportMetadata);
