import { defineEndpointTransport } from "../runtime/transportRuntime";
import type { EndpointTransportBindingMetadata } from "../runtime/transportTypes";
import metadataJson from "./data/serviceRequestControllerCreateTransport.metadata.generated.json";
import type { CreateServiceRequestRequest } from "../servicerequests/types/CreateServiceRequestRequest.generated";import type { ServiceRequestDto } from "../servicerequests/types/ServiceRequestDto.generated";
export const serviceRequestControllerCreateTransportMetadata = metadataJson as EndpointTransportBindingMetadata;

export const serviceRequestControllerCreateTransport = defineEndpointTransport<CreateServiceRequestRequest, ServiceRequestDto>(serviceRequestControllerCreateTransportMetadata);
