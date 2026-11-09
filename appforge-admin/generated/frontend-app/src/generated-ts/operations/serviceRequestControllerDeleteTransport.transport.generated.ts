import { defineEndpointTransport } from "../runtime/transportRuntime";
import type { EndpointTransportBindingMetadata } from "../runtime/transportTypes";
import metadataJson from "./data/serviceRequestControllerDeleteTransport.metadata.generated.json";

export const serviceRequestControllerDeleteTransportMetadata = metadataJson as EndpointTransportBindingMetadata;

export const serviceRequestControllerDeleteTransport = defineEndpointTransport<{ id: string; }, void>(serviceRequestControllerDeleteTransportMetadata);
