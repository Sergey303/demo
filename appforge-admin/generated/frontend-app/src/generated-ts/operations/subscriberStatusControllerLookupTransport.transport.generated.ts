import { defineEndpointTransport } from "../runtime/transportRuntime";
import type { EndpointTransportBindingMetadata } from "../runtime/transportTypes";
import metadataJson from "./data/subscriberStatusControllerLookupTransport.metadata.generated.json";
import type { LookupSubscriberStatusRequest } from "../subscriberstatuses/types/LookupSubscriberStatusRequest.generated";import type { SubscriberStatusLookupDto } from "../subscriberstatuses/types/SubscriberStatusLookupDto.generated";
export const subscriberStatusControllerLookupTransportMetadata = metadataJson as EndpointTransportBindingMetadata;

export const subscriberStatusControllerLookupTransport = defineEndpointTransport<{ request: LookupSubscriberStatusRequest; }, SubscriberStatusLookupDto[]>(subscriberStatusControllerLookupTransportMetadata);
