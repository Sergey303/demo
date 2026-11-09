import { defineEndpointTransport } from "../runtime/transportRuntime";
import type { EndpointTransportBindingMetadata } from "../runtime/transportTypes";
import metadataJson from "./data/customerControllerCreateTransport.metadata.generated.json";
import type { CreateCustomerRequest } from "../customers/types/CreateCustomerRequest.generated";import type { CustomerDto } from "../customers/types/CustomerDto.generated";
export const customerControllerCreateTransportMetadata = metadataJson as EndpointTransportBindingMetadata;

export const customerControllerCreateTransport = defineEndpointTransport<CreateCustomerRequest, CustomerDto>(customerControllerCreateTransportMetadata);
