import { defineEndpointTransport } from "../runtime/transportRuntime";
import type { EndpointTransportBindingMetadata } from "../runtime/transportTypes";
import metadataJson from "./data/leadStatusControllerCreateTransport.metadata.generated.json";
import type { CreateLeadStatusRequest } from "../leadstatuses/types/CreateLeadStatusRequest.generated";import type { LeadStatusDto } from "../leadstatuses/types/LeadStatusDto.generated";
export const leadStatusControllerCreateTransportMetadata = metadataJson as EndpointTransportBindingMetadata;

export const leadStatusControllerCreateTransport = defineEndpointTransport<CreateLeadStatusRequest, LeadStatusDto>(leadStatusControllerCreateTransportMetadata);
