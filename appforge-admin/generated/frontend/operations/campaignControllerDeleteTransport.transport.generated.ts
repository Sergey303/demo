import { defineEndpointTransport } from "../runtime/transportRuntime";
import type { EndpointTransportBindingMetadata } from "../runtime/transportTypes";
import metadataJson from "./data/campaignControllerDeleteTransport.metadata.generated.json";

export const campaignControllerDeleteTransportMetadata = metadataJson as EndpointTransportBindingMetadata;

export const campaignControllerDeleteTransport = defineEndpointTransport<{ id: string; }, void>(campaignControllerDeleteTransportMetadata);
