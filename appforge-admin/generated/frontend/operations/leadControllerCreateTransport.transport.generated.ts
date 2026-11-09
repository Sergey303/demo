import { defineEndpointTransport } from "../runtime/transportRuntime";
import type { EndpointTransportBindingMetadata } from "../runtime/transportTypes";
import metadataJson from "./data/leadControllerCreateTransport.metadata.generated.json";
import type { CreateLeadRequest } from "../leads/types/CreateLeadRequest.generated";import type { LeadDto } from "../leads/types/LeadDto.generated";
export const leadControllerCreateTransportMetadata = metadataJson as EndpointTransportBindingMetadata;

export const leadControllerCreateTransport = defineEndpointTransport<CreateLeadRequest, LeadDto>(leadControllerCreateTransportMetadata);
