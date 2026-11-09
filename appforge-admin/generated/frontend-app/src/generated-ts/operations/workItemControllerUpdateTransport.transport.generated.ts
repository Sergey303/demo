import { defineEndpointTransport } from "../runtime/transportRuntime";
import type { EndpointTransportBindingMetadata } from "../runtime/transportTypes";
import metadataJson from "./data/workItemControllerUpdateTransport.metadata.generated.json";
import type { UpdateWorkItemRequest } from "../workitems/types/UpdateWorkItemRequest.generated";import type { WorkItemDto } from "../workitems/types/WorkItemDto.generated";
export const workItemControllerUpdateTransportMetadata = metadataJson as EndpointTransportBindingMetadata;

export const workItemControllerUpdateTransport = defineEndpointTransport<{ id: string; body: UpdateWorkItemRequest; }, WorkItemDto>(workItemControllerUpdateTransportMetadata);
