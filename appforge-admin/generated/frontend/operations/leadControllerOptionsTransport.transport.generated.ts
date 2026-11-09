import { defineEndpointTransport } from "../runtime/transportRuntime";
import type { EndpointTransportBindingMetadata } from "../runtime/transportTypes";
import metadataJson from "./data/leadControllerOptionsTransport.metadata.generated.json";
import type { LeadOptionDto } from "../leads/types/LeadOptionDto.generated";
export const leadControllerOptionsTransportMetadata = metadataJson as EndpointTransportBindingMetadata;

export const leadControllerOptionsTransport = defineEndpointTransport<{ field: string; }, LeadOptionDto[]>(leadControllerOptionsTransportMetadata);
