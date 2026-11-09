import { defineEndpointTransport } from "../runtime/transportRuntime";
import type { EndpointTransportBindingMetadata } from "../runtime/transportTypes";
import metadataJson from "./data/workItemControllerCreateTransport.metadata.generated.json";
import type { CreateWorkItemRequest } from "../workitems/types/CreateWorkItemRequest.generated";import type { WorkItemDto } from "../workitems/types/WorkItemDto.generated";
export const workItemControllerCreateTransportMetadata = metadataJson as EndpointTransportBindingMetadata;

export const workItemControllerCreateTransport = defineEndpointTransport<CreateWorkItemRequest, WorkItemDto>(workItemControllerCreateTransportMetadata);
