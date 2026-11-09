import { defineEndpointTransport } from "../runtime/transportRuntime";
import type { EndpointTransportBindingMetadata } from "../runtime/transportTypes";
import metadataJson from "./data/subscriberControllerGetTransport.metadata.generated.json";
import type { SubscriberDto } from "../subscribers/types/SubscriberDto.generated";
export const subscriberControllerGetTransportMetadata = metadataJson as EndpointTransportBindingMetadata;

export const subscriberControllerGetTransport = defineEndpointTransport<{ id: string; }, SubscriberDto>(subscriberControllerGetTransportMetadata);
