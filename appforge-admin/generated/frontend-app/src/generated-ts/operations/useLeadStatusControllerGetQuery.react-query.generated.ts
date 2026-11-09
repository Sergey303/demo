// ------------------------------------------------------------------------------
// GENERATED FILE - source: leadstatuses/endpoints.json
// DO NOT EDIT MANUALLY.
// ------------------------------------------------------------------------------

import { useGeneratedQuery } from "../runtime/reactQueryRuntime";
import type { GeneratedEndpointInput, GeneratedQueryOptions } from "../runtime/reactQueryTypes";
import { leadStatusControllerGetQuery } from "./leadStatusControllerGetQuery.query.generated";
import type { LeadStatusDto } from "../leadstatuses/types/LeadStatusDto.generated";

export function useLeadStatusControllerGetQuery(
  input: GeneratedEndpointInput<{ id: string; }>,
  options?: GeneratedQueryOptions<LeadStatusDto>,
  _config?: unknown,
) {
  return useGeneratedQuery(leadStatusControllerGetQuery, input, options);
}
