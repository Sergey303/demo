import { defineEndpointTransport } from "../runtime/transportRuntime";
import type { EndpointTransportBindingMetadata } from "../runtime/transportTypes";
import metadataJson from "./data/leadStatusControllerDeleteTransport.metadata.generated.json";

export const leadStatusControllerDeleteTransportMetadata = metadataJson as EndpointTransportBindingMetadata;

export const leadStatusControllerDeleteTransport = defineEndpointTransport<{ id: string; }, void>(leadStatusControllerDeleteTransportMetadata);
