import { defineEndpointTransport } from "../runtime/transportRuntime";
import type { EndpointTransportBindingMetadata } from "../runtime/transportTypes";
import metadataJson from "./data/customerControllerUpdateTransport.metadata.generated.json";
import type { CustomerDto } from "../customers/types/CustomerDto.generated";import type { UpdateCustomerRequest } from "../customers/types/UpdateCustomerRequest.generated";
export const customerControllerUpdateTransportMetadata = metadataJson as EndpointTransportBindingMetadata;

export const customerControllerUpdateTransport = defineEndpointTransport<{ id: string; body: UpdateCustomerRequest; }, CustomerDto>(customerControllerUpdateTransportMetadata);
