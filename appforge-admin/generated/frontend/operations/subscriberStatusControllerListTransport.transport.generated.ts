import { defineEndpointTransport } from "../runtime/transportRuntime";
import type { EndpointTransportBindingMetadata } from "../runtime/transportTypes";
import metadataJson from "./data/subscriberStatusControllerListTransport.metadata.generated.json";
import type { ListSubscriberStatusRequest } from "../subscriberstatuses/types/ListSubscriberStatusRequest.generated";import type { ListSubscriberStatusResult } from "../subscriberstatuses/types/ListSubscriberStatusResult.generated";
export const subscriberStatusControllerListTransportMetadata = metadataJson as EndpointTransportBindingMetadata;

export const subscriberStatusControllerListTransport = defineEndpointTransport<{ request: ListSubscriberStatusRequest; }, ListSubscriberStatusResult>(subscriberStatusControllerListTransportMetadata);
