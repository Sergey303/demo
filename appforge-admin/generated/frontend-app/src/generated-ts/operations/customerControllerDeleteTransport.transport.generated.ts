import { defineEndpointTransport } from "../runtime/transportRuntime";
import type { EndpointTransportBindingMetadata } from "../runtime/transportTypes";
import metadataJson from "./data/customerControllerDeleteTransport.metadata.generated.json";

export const customerControllerDeleteTransportMetadata = metadataJson as EndpointTransportBindingMetadata;

export const customerControllerDeleteTransport = defineEndpointTransport<{ id: string; }, void>(customerControllerDeleteTransportMetadata);
