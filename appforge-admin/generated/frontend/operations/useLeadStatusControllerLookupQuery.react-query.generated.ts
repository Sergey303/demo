// ------------------------------------------------------------------------------
// GENERATED FILE - source: leadstatuses/endpoints.json
// DO NOT EDIT MANUALLY.
// ------------------------------------------------------------------------------

import { useGeneratedQuery } from "../runtime/reactQueryRuntime";
import type { GeneratedEndpointInput, GeneratedQueryOptions } from "../runtime/reactQueryTypes";
import { leadStatusControllerLookupQuery } from "./leadStatusControllerLookupQuery.query.generated";
import type { LeadStatusLookupDto } from "../leadstatuses/types/LeadStatusLookupDto.generated";
import type { LookupLeadStatusRequest } from "../leadstatuses/types/LookupLeadStatusRequest.generated";

export function useLeadStatusControllerLookupQuery(
  input: GeneratedEndpointInput<{ request: LookupLeadStatusRequest; }>,
  options?: GeneratedQueryOptions<LeadStatusLookupDto[]>,
  _config?: unknown,
) {
  return useGeneratedQuery(leadStatusControllerLookupQuery, input, options);
}
