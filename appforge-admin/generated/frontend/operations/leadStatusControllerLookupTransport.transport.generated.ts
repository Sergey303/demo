import { defineEndpointTransport } from "../runtime/transportRuntime";
import type { EndpointTransportBindingMetadata } from "../runtime/transportTypes";
import metadataJson from "./data/leadStatusControllerLookupTransport.metadata.generated.json";
import type { LeadStatusLookupDto } from "../leadstatuses/types/LeadStatusLookupDto.generated";import type { LookupLeadStatusRequest } from "../leadstatuses/types/LookupLeadStatusRequest.generated";
export const leadStatusControllerLookupTransportMetadata = metadataJson as EndpointTransportBindingMetadata;

export const leadStatusControllerLookupTransport = defineEndpointTransport<{ request: LookupLeadStatusRequest; }, LeadStatusLookupDto[]>(leadStatusControllerLookupTransportMetadata);
