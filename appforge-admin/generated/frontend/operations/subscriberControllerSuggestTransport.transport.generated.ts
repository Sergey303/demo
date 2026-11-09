import { defineEndpointTransport } from "../runtime/transportRuntime";
import type { EndpointTransportBindingMetadata } from "../runtime/transportTypes";
import metadataJson from "./data/subscriberControllerSuggestTransport.metadata.generated.json";
import type { SubscriberSuggestionDto } from "../subscribers/types/SubscriberSuggestionDto.generated";import type { SuggestSubscriberRequest } from "../subscribers/types/SuggestSubscriberRequest.generated";
export const subscriberControllerSuggestTransportMetadata = metadataJson as EndpointTransportBindingMetadata;

export const subscriberControllerSuggestTransport = defineEndpointTransport<{ field: string; request: SuggestSubscriberRequest; }, SubscriberSuggestionDto[]>(subscriberControllerSuggestTransportMetadata);
