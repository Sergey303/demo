import { defineEndpointTransport } from "../runtime/transportRuntime";
import type { EndpointTransportBindingMetadata } from "../runtime/transportTypes";
import metadataJson from "./data/subscriberControllerOptionsTransport.metadata.generated.json";
import type { SubscriberOptionDto } from "../subscribers/types/SubscriberOptionDto.generated";
export const subscriberControllerOptionsTransportMetadata = metadataJson as EndpointTransportBindingMetadata;

export const subscriberControllerOptionsTransport = defineEndpointTransport<{ field: string; }, SubscriberOptionDto[]>(subscriberControllerOptionsTransportMetadata);
