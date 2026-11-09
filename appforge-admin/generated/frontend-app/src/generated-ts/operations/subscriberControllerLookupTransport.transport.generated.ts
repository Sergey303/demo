import { defineEndpointTransport } from "../runtime/transportRuntime";
import type { EndpointTransportBindingMetadata } from "../runtime/transportTypes";
import metadataJson from "./data/subscriberControllerLookupTransport.metadata.generated.json";
import type { LookupSubscriberRequest } from "../subscribers/types/LookupSubscriberRequest.generated";import type { SubscriberLookupDto } from "../subscribers/types/SubscriberLookupDto.generated";
export const subscriberControllerLookupTransportMetadata = metadataJson as EndpointTransportBindingMetadata;

export const subscriberControllerLookupTransport = defineEndpointTransport<{ request: LookupSubscriberRequest; }, SubscriberLookupDto[]>(subscriberControllerLookupTransportMetadata);
