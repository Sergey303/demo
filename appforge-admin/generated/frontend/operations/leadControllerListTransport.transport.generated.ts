import { defineEndpointTransport } from "../runtime/transportRuntime";
import type { EndpointTransportBindingMetadata } from "../runtime/transportTypes";
import metadataJson from "./data/leadControllerListTransport.metadata.generated.json";
import type { ListLeadRequest } from "../leads/types/ListLeadRequest.generated";import type { ListLeadResult } from "../leads/types/ListLeadResult.generated";
export const leadControllerListTransportMetadata = metadataJson as EndpointTransportBindingMetadata;

export const leadControllerListTransport = defineEndpointTransport<{ request: ListLeadRequest; }, ListLeadResult>(leadControllerListTransportMetadata);
