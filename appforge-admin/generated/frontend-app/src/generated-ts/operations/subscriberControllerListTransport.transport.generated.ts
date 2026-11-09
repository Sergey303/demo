import { defineEndpointTransport } from "../runtime/transportRuntime";
import type { EndpointTransportBindingMetadata } from "../runtime/transportTypes";
import metadataJson from "./data/subscriberControllerListTransport.metadata.generated.json";
import type { ListSubscriberRequest } from "../subscribers/types/ListSubscriberRequest.generated";import type { ListSubscriberResult } from "../subscribers/types/ListSubscriberResult.generated";
export const subscriberControllerListTransportMetadata = metadataJson as EndpointTransportBindingMetadata;

export const subscriberControllerListTransport = defineEndpointTransport<{ request: ListSubscriberRequest; }, ListSubscriberResult>(subscriberControllerListTransportMetadata);
