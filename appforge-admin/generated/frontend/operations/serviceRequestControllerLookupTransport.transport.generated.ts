import { defineEndpointTransport } from "../runtime/transportRuntime";
import type { EndpointTransportBindingMetadata } from "../runtime/transportTypes";
import metadataJson from "./data/serviceRequestControllerLookupTransport.metadata.generated.json";
import type { LookupServiceRequestRequest } from "../servicerequests/types/LookupServiceRequestRequest.generated";import type { ServiceRequestLookupDto } from "../servicerequests/types/ServiceRequestLookupDto.generated";
export const serviceRequestControllerLookupTransportMetadata = metadataJson as EndpointTransportBindingMetadata;

export const serviceRequestControllerLookupTransport = defineEndpointTransport<{ request: LookupServiceRequestRequest; }, ServiceRequestLookupDto[]>(serviceRequestControllerLookupTransportMetadata);
