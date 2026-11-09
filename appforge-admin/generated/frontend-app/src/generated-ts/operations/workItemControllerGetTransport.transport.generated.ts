import { defineEndpointTransport } from "../runtime/transportRuntime";
import type { EndpointTransportBindingMetadata } from "../runtime/transportTypes";
import metadataJson from "./data/workItemControllerGetTransport.metadata.generated.json";
import type { WorkItemDto } from "../workitems/types/WorkItemDto.generated";
export const workItemControllerGetTransportMetadata = metadataJson as EndpointTransportBindingMetadata;

export const workItemControllerGetTransport = defineEndpointTransport<{ id: string; }, WorkItemDto>(workItemControllerGetTransportMetadata);
