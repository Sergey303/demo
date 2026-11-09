import { defineEndpointTransport } from "../runtime/transportRuntime";
import type { EndpointTransportBindingMetadata } from "../runtime/transportTypes";
import metadataJson from "./data/workItemControllerOptionsTransport.metadata.generated.json";
import type { WorkItemOptionDto } from "../workitems/types/WorkItemOptionDto.generated";
export const workItemControllerOptionsTransportMetadata = metadataJson as EndpointTransportBindingMetadata;

export const workItemControllerOptionsTransport = defineEndpointTransport<{ field: string; }, WorkItemOptionDto[]>(workItemControllerOptionsTransportMetadata);
