import { defineEndpointTransport } from "../runtime/transportRuntime";
import type { EndpointTransportBindingMetadata } from "../runtime/transportTypes";
import metadataJson from "./data/workItemControllerSuggestTransport.metadata.generated.json";
import type { SuggestWorkItemRequest } from "../workitems/types/SuggestWorkItemRequest.generated";import type { WorkItemSuggestionDto } from "../workitems/types/WorkItemSuggestionDto.generated";
export const workItemControllerSuggestTransportMetadata = metadataJson as EndpointTransportBindingMetadata;

export const workItemControllerSuggestTransport = defineEndpointTransport<{ field: string; request: SuggestWorkItemRequest; }, WorkItemSuggestionDto[]>(workItemControllerSuggestTransportMetadata);
