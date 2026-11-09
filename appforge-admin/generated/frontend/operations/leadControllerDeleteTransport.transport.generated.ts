import { defineEndpointTransport } from "../runtime/transportRuntime";
import type { EndpointTransportBindingMetadata } from "../runtime/transportTypes";
import metadataJson from "./data/leadControllerDeleteTransport.metadata.generated.json";

export const leadControllerDeleteTransportMetadata = metadataJson as EndpointTransportBindingMetadata;

export const leadControllerDeleteTransport = defineEndpointTransport<{ id: string; }, void>(leadControllerDeleteTransportMetadata);
