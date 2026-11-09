import { defineEndpointTransport } from "../runtime/transportRuntime";
import type { EndpointTransportBindingMetadata } from "../runtime/transportTypes";
import metadataJson from "./data/subscriberStatusControllerCreateTransport.metadata.generated.json";
import type { CreateSubscriberStatusRequest } from "../subscriberstatuses/types/CreateSubscriberStatusRequest.generated";import type { SubscriberStatusDto } from "../subscriberstatuses/types/SubscriberStatusDto.generated";
export const subscriberStatusControllerCreateTransportMetadata = metadataJson as EndpointTransportBindingMetadata;

export const subscriberStatusControllerCreateTransport = defineEndpointTransport<CreateSubscriberStatusRequest, SubscriberStatusDto>(subscriberStatusControllerCreateTransportMetadata);
