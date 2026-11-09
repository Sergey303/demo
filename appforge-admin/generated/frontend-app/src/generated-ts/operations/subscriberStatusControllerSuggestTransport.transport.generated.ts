import { defineEndpointTransport } from "../runtime/transportRuntime";
import type { EndpointTransportBindingMetadata } from "../runtime/transportTypes";
import metadataJson from "./data/subscriberStatusControllerSuggestTransport.metadata.generated.json";
import type { SubscriberStatusSuggestionDto } from "../subscriberstatuses/types/SubscriberStatusSuggestionDto.generated";import type { SuggestSubscriberStatusRequest } from "../subscriberstatuses/types/SuggestSubscriberStatusRequest.generated";
export const subscriberStatusControllerSuggestTransportMetadata = metadataJson as EndpointTransportBindingMetadata;

export const subscriberStatusControllerSuggestTransport = defineEndpointTransport<{ field: string; request: SuggestSubscriberStatusRequest; }, SubscriberStatusSuggestionDto[]>(subscriberStatusControllerSuggestTransportMetadata);
