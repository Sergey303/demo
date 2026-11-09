// ------------------------------------------------------------------------------
// GENERATED FILE - source: leads/endpoints.json
// DO NOT EDIT MANUALLY.
// ------------------------------------------------------------------------------

import { useGeneratedQuery } from "../runtime/reactQueryRuntime";
import type { GeneratedEndpointInput, GeneratedQueryOptions } from "../runtime/reactQueryTypes";
import { leadControllerGetQuery } from "./leadControllerGetQuery.query.generated";
import type { LeadDto } from "../leads/types/LeadDto.generated";

export function useLeadControllerGetQuery(
  input: GeneratedEndpointInput<{ id: string; }>,
  options?: GeneratedQueryOptions<LeadDto>,
  _config?: unknown,
) {
  return useGeneratedQuery(leadControllerGetQuery, input, options);
}
