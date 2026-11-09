import { defineEndpointTransport } from "../runtime/transportRuntime";
import type { EndpointTransportBindingMetadata } from "../runtime/transportTypes";
import metadataJson from "./data/leadControllerUpdateTransport.metadata.generated.json";
import type { LeadDto } from "../leads/types/LeadDto.generated";import type { UpdateLeadRequest } from "../leads/types/UpdateLeadRequest.generated";
export const leadControllerUpdateTransportMetadata = metadataJson as EndpointTransportBindingMetadata;

export const leadControllerUpdateTransport = defineEndpointTransport<{ id: string; body: UpdateLeadRequest; }, LeadDto>(leadControllerUpdateTransportMetadata);
