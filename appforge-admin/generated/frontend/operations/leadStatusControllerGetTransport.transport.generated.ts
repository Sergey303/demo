import { defineEndpointTransport } from "../runtime/transportRuntime";
import type { EndpointTransportBindingMetadata } from "../runtime/transportTypes";
import metadataJson from "./data/leadStatusControllerGetTransport.metadata.generated.json";
import type { LeadStatusDto } from "../leadstatuses/types/LeadStatusDto.generated";
export const leadStatusControllerGetTransportMetadata = metadataJson as EndpointTransportBindingMetadata;

export const leadStatusControllerGetTransport = defineEndpointTransport<{ id: string; }, LeadStatusDto>(leadStatusControllerGetTransportMetadata);
