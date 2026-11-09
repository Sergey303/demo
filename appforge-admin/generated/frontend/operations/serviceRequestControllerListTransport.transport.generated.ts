import { defineEndpointTransport } from "../runtime/transportRuntime";
import type { EndpointTransportBindingMetadata } from "../runtime/transportTypes";
import metadataJson from "./data/serviceRequestControllerListTransport.metadata.generated.json";
import type { ListServiceRequestRequest } from "../servicerequests/types/ListServiceRequestRequest.generated";import type { ListServiceRequestResult } from "../servicerequests/types/ListServiceRequestResult.generated";
export const serviceRequestControllerListTransportMetadata = metadataJson as EndpointTransportBindingMetadata;

export const serviceRequestControllerListTransport = defineEndpointTransport<{ request: ListServiceRequestRequest; }, ListServiceRequestResult>(serviceRequestControllerListTransportMetadata);
