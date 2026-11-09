import { defineEndpointTransport } from "../runtime/transportRuntime";
import type { EndpointTransportBindingMetadata } from "../runtime/transportTypes";
import metadataJson from "./data/leadControllerGetTransport.metadata.generated.json";
import type { LeadDto } from "../leads/types/LeadDto.generated";
export const leadControllerGetTransportMetadata = metadataJson as EndpointTransportBindingMetadata;

export const leadControllerGetTransport = defineEndpointTransport<{ id: string; }, LeadDto>(leadControllerGetTransportMetadata);
