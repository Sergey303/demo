import { defineEndpointTransport } from "../runtime/transportRuntime";
import type { EndpointTransportBindingMetadata } from "../runtime/transportTypes";
import metadataJson from "./data/subscriberStatusControllerOptionsTransport.metadata.generated.json";
import type { SubscriberStatusOptionDto } from "../subscriberstatuses/types/SubscriberStatusOptionDto.generated";
export const subscriberStatusControllerOptionsTransportMetadata = metadataJson as EndpointTransportBindingMetadata;

export const subscriberStatusControllerOptionsTransport = defineEndpointTransport<{ field: string; }, SubscriberStatusOptionDto[]>(subscriberStatusControllerOptionsTransportMetadata);
