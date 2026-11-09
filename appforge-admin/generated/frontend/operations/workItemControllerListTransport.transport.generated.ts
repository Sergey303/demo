import { defineEndpointTransport } from "../runtime/transportRuntime";
import type { EndpointTransportBindingMetadata } from "../runtime/transportTypes";
import metadataJson from "./data/workItemControllerListTransport.metadata.generated.json";
import type { ListWorkItemRequest } from "../workitems/types/ListWorkItemRequest.generated";import type { ListWorkItemResult } from "../workitems/types/ListWorkItemResult.generated";
export const workItemControllerListTransportMetadata = metadataJson as EndpointTransportBindingMetadata;

export const workItemControllerListTransport = defineEndpointTransport<{ request: ListWorkItemRequest; }, ListWorkItemResult>(workItemControllerListTransportMetadata);
