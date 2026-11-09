// ------------------------------------------------------------------------------
// GENERATED FILE - source: leads/endpoints.json
// DO NOT EDIT MANUALLY.
// ------------------------------------------------------------------------------

import { useGeneratedQuery } from "../runtime/reactQueryRuntime";
import type { GeneratedEndpointInput, GeneratedQueryOptions } from "../runtime/reactQueryTypes";
import { leadControllerListQuery } from "./leadControllerListQuery.query.generated";
import type { ListLeadRequest } from "../leads/types/ListLeadRequest.generated";
import type { ListLeadResult } from "../leads/types/ListLeadResult.generated";

export function useLeadControllerListQuery(
  input: GeneratedEndpointInput<{ request: ListLeadRequest; }>,
  options?: GeneratedQueryOptions<ListLeadResult>,
  _config?: unknown,
) {
  return useGeneratedQuery(leadControllerListQuery, input, options);
}
