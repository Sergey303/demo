import { defineEndpointTransport } from "../runtime/transportRuntime";
import type { EndpointTransportBindingMetadata } from "../runtime/transportTypes";
import metadataJson from "./data/leadStatusControllerUpdateTransport.metadata.generated.json";
import type { LeadStatusDto } from "../leadstatuses/types/LeadStatusDto.generated";import type { UpdateLeadStatusRequest } from "../leadstatuses/types/UpdateLeadStatusRequest.generated";
export const leadStatusControllerUpdateTransportMetadata = metadataJson as EndpointTransportBindingMetadata;

export const leadStatusControllerUpdateTransport = defineEndpointTransport<{ id: string; body: UpdateLeadStatusRequest; }, LeadStatusDto>(leadStatusControllerUpdateTransportMetadata);
