import { defineEndpointTransport } from "../runtime/transportRuntime";
import type { EndpointTransportBindingMetadata } from "../runtime/transportTypes";
import metadataJson from "./data/leadStatusControllerOptionsTransport.metadata.generated.json";
import type { LeadStatusOptionDto } from "../leadstatuses/types/LeadStatusOptionDto.generated";
export const leadStatusControllerOptionsTransportMetadata = metadataJson as EndpointTransportBindingMetadata;

export const leadStatusControllerOptionsTransport = defineEndpointTransport<{ field: string; }, LeadStatusOptionDto[]>(leadStatusControllerOptionsTransportMetadata);
