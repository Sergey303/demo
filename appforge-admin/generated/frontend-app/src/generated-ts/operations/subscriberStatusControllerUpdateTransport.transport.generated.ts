import { defineEndpointTransport } from "../runtime/transportRuntime";
import type { EndpointTransportBindingMetadata } from "../runtime/transportTypes";
import metadataJson from "./data/subscriberStatusControllerUpdateTransport.metadata.generated.json";
import type { SubscriberStatusDto } from "../subscriberstatuses/types/SubscriberStatusDto.generated";import type { UpdateSubscriberStatusRequest } from "../subscriberstatuses/types/UpdateSubscriberStatusRequest.generated";
export const subscriberStatusControllerUpdateTransportMetadata = metadataJson as EndpointTransportBindingMetadata;

export const subscriberStatusControllerUpdateTransport = defineEndpointTransport<{ id: string; body: UpdateSubscriberStatusRequest; }, SubscriberStatusDto>(subscriberStatusControllerUpdateTransportMetadata);
