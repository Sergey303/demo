import { defineEndpointTransport } from "../runtime/transportRuntime";
import type { EndpointTransportBindingMetadata } from "../runtime/transportTypes";
import metadataJson from "./data/leadStatusControllerListTransport.metadata.generated.json";
import type { ListLeadStatusRequest } from "../leadstatuses/types/ListLeadStatusRequest.generated";import type { ListLeadStatusResult } from "../leadstatuses/types/ListLeadStatusResult.generated";
export const leadStatusControllerListTransportMetadata = metadataJson as EndpointTransportBindingMetadata;

export const leadStatusControllerListTransport = defineEndpointTransport<{ request: ListLeadStatusRequest; }, ListLeadStatusResult>(leadStatusControllerListTransportMetadata);
