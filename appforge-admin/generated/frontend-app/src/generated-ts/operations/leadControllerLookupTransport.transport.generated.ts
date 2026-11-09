import { defineEndpointTransport } from "../runtime/transportRuntime";
import type { EndpointTransportBindingMetadata } from "../runtime/transportTypes";
import metadataJson from "./data/leadControllerLookupTransport.metadata.generated.json";
import type { LeadLookupDto } from "../leads/types/LeadLookupDto.generated";import type { LookupLeadRequest } from "../leads/types/LookupLeadRequest.generated";
export const leadControllerLookupTransportMetadata = metadataJson as EndpointTransportBindingMetadata;

export const leadControllerLookupTransport = defineEndpointTransport<{ request: LookupLeadRequest; }, LeadLookupDto[]>(leadControllerLookupTransportMetadata);
