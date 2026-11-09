import { defineEndpointTransport } from "../runtime/transportRuntime";
import type { EndpointTransportBindingMetadata } from "../runtime/transportTypes";
import metadataJson from "./data/customerControllerListTransport.metadata.generated.json";
import type { ListCustomerRequest } from "../customers/types/ListCustomerRequest.generated";import type { ListCustomerResult } from "../customers/types/ListCustomerResult.generated";
export const customerControllerListTransportMetadata = metadataJson as EndpointTransportBindingMetadata;

export const customerControllerListTransport = defineEndpointTransport<{ request: ListCustomerRequest; }, ListCustomerResult>(customerControllerListTransportMetadata);
