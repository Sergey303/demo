import { defineEndpointTransport } from "../runtime/transportRuntime";
import type { EndpointTransportBindingMetadata } from "../runtime/transportTypes";
import metadataJson from "./data/campaignStatusControllerDeleteTransport.metadata.generated.json";

export const campaignStatusControllerDeleteTransportMetadata = metadataJson as EndpointTransportBindingMetadata;

export const campaignStatusControllerDeleteTransport = defineEndpointTransport<{ id: string; }, void>(campaignStatusControllerDeleteTransportMetadata);
