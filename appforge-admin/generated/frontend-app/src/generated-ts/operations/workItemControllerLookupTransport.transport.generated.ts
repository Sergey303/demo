import { defineEndpointTransport } from "../runtime/transportRuntime";
import type { EndpointTransportBindingMetadata } from "../runtime/transportTypes";
import metadataJson from "./data/workItemControllerLookupTransport.metadata.generated.json";
import type { LookupWorkItemRequest } from "../workitems/types/LookupWorkItemRequest.generated";import type { WorkItemLookupDto } from "../workitems/types/WorkItemLookupDto.generated";
export const workItemControllerLookupTransportMetadata = metadataJson as EndpointTransportBindingMetadata;

export const workItemControllerLookupTransport = defineEndpointTransport<{ request: LookupWorkItemRequest; }, WorkItemLookupDto[]>(workItemControllerLookupTransportMetadata);
