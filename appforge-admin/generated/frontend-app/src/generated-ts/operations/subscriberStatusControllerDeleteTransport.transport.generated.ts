import { defineEndpointTransport } from "../runtime/transportRuntime";
import type { EndpointTransportBindingMetadata } from "../runtime/transportTypes";
import metadataJson from "./data/subscriberStatusControllerDeleteTransport.metadata.generated.json";

export const subscriberStatusControllerDeleteTransportMetadata = metadataJson as EndpointTransportBindingMetadata;

export const subscriberStatusControllerDeleteTransport = defineEndpointTransport<{ id: string; }, void>(subscriberStatusControllerDeleteTransportMetadata);
