import { defineEndpointTransport } from "../runtime/transportRuntime";
import type { EndpointTransportBindingMetadata } from "../runtime/transportTypes";
import metadataJson from "./data/subscriberControllerUpdateTransport.metadata.generated.json";
import type { SubscriberDto } from "../subscribers/types/SubscriberDto.generated";import type { UpdateSubscriberRequest } from "../subscribers/types/UpdateSubscriberRequest.generated";
export const subscriberControllerUpdateTransportMetadata = metadataJson as EndpointTransportBindingMetadata;

export const subscriberControllerUpdateTransport = defineEndpointTransport<{ id: string; body: UpdateSubscriberRequest; }, SubscriberDto>(subscriberControllerUpdateTransportMetadata);
