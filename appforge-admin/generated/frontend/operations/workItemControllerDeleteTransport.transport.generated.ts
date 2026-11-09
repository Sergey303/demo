import { defineEndpointTransport } from "../runtime/transportRuntime";
import type { EndpointTransportBindingMetadata } from "../runtime/transportTypes";
import metadataJson from "./data/workItemControllerDeleteTransport.metadata.generated.json";

export const workItemControllerDeleteTransportMetadata = metadataJson as EndpointTransportBindingMetadata;

export const workItemControllerDeleteTransport = defineEndpointTransport<{ id: string; }, void>(workItemControllerDeleteTransportMetadata);
