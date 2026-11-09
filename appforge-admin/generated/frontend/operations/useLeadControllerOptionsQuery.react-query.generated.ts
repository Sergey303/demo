// ------------------------------------------------------------------------------
// GENERATED FILE - source: leads/endpoints.json
// DO NOT EDIT MANUALLY.
// ------------------------------------------------------------------------------

import { useGeneratedQuery } from "../runtime/reactQueryRuntime";
import type { GeneratedEndpointInput, GeneratedQueryOptions } from "../runtime/reactQueryTypes";
import { leadControllerOptionsQuery } from "./leadControllerOptionsQuery.query.generated";
import type { LeadOptionDto } from "../leads/types/LeadOptionDto.generated";

export function useLeadControllerOptionsQuery(
  input: GeneratedEndpointInput<{ field: string; }>,
  options?: GeneratedQueryOptions<LeadOptionDto[]>,
  _config?: unknown,
) {
  return useGeneratedQuery(leadControllerOptionsQuery, input, options);
}
