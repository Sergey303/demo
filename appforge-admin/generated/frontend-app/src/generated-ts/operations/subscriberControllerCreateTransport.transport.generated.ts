import { defineEndpointTransport } from "../runtime/transportRuntime";
import type { EndpointTransportBindingMetadata } from "../runtime/transportTypes";
import metadataJson from "./data/subscriberControllerCreateTransport.metadata.generated.json";
import type { CreateSubscriberRequest } from "../subscribers/types/CreateSubscriberRequest.generated";import type { SubscriberDto } from "../subscribers/types/SubscriberDto.generated";
export const subscriberControllerCreateTransportMetadata = metadataJson as EndpointTransportBindingMetadata;

export const subscriberControllerCreateTransport = defineEndpointTransport<CreateSubscriberRequest, SubscriberDto>(subscriberControllerCreateTransportMetadata);
