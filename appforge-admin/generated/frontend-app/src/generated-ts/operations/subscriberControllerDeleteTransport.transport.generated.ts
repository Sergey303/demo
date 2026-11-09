import { defineEndpointTransport } from "../runtime/transportRuntime";
import type { EndpointTransportBindingMetadata } from "../runtime/transportTypes";
import metadataJson from "./data/subscriberControllerDeleteTransport.metadata.generated.json";

export const subscriberControllerDeleteTransportMetadata = metadataJson as EndpointTransportBindingMetadata;

export const subscriberControllerDeleteTransport = defineEndpointTransport<{ id: string; }, void>(subscriberControllerDeleteTransportMetadata);
