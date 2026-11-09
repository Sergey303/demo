import { defineEndpointTransport } from "../runtime/transportRuntime";
import type { EndpointTransportBindingMetadata } from "../runtime/transportTypes";
import metadataJson from "./data/subscriberStatusControllerGetTransport.metadata.generated.json";
import type { SubscriberStatusDto } from "../subscriberstatuses/types/SubscriberStatusDto.generated";
export const subscriberStatusControllerGetTransportMetadata = metadataJson as EndpointTransportBindingMetadata;

export const subscriberStatusControllerGetTransport = defineEndpointTransport<{ id: string; }, SubscriberStatusDto>(subscriberStatusControllerGetTransportMetadata);
