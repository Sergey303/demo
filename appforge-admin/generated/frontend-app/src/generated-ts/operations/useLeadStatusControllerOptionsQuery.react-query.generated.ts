// ------------------------------------------------------------------------------
// GENERATED FILE - source: leadstatuses/endpoints.json
// DO NOT EDIT MANUALLY.
// ------------------------------------------------------------------------------

import { useGeneratedQuery } from "../runtime/reactQueryRuntime";
import type { GeneratedEndpointInput, GeneratedQueryOptions } from "../runtime/reactQueryTypes";
import { leadStatusControllerOptionsQuery } from "./leadStatusControllerOptionsQuery.query.generated";
import type { LeadStatusOptionDto } from "../leadstatuses/types/LeadStatusOptionDto.generated";

export function useLeadStatusControllerOptionsQuery(
  input: GeneratedEndpointInput<{ field: string; }>,
  options?: GeneratedQueryOptions<LeadStatusOptionDto[]>,
  _config?: unknown,
) {
  return useGeneratedQuery(leadStatusControllerOptionsQuery, input, options);
}
