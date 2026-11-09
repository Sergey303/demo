// ------------------------------------------------------------------------------
// GENERATED FILE - source: leads/endpoints.json
// DO NOT EDIT MANUALLY.
// ------------------------------------------------------------------------------

import { useGeneratedQuery } from "../runtime/reactQueryRuntime";
import type { GeneratedEndpointInput, GeneratedQueryOptions } from "../runtime/reactQueryTypes";
import { leadControllerLookupQuery } from "./leadControllerLookupQuery.query.generated";
import type { LeadLookupDto } from "../leads/types/LeadLookupDto.generated";
import type { LookupLeadRequest } from "../leads/types/LookupLeadRequest.generated";

export function useLeadControllerLookupQuery(
  input: GeneratedEndpointInput<{ request: LookupLeadRequest; }>,
  options?: GeneratedQueryOptions<LeadLookupDto[]>,
  _config?: unknown,
) {
  return useGeneratedQuery(leadControllerLookupQuery, input, options);
}
