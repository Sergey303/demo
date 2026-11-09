// ------------------------------------------------------------------------------
// GENERATED FILE - source: leadstatuses/endpoints.json
// DO NOT EDIT MANUALLY.
// ------------------------------------------------------------------------------

import { useGeneratedQuery } from "../runtime/reactQueryRuntime";
import type { GeneratedEndpointInput, GeneratedQueryOptions } from "../runtime/reactQueryTypes";
import { leadStatusControllerListQuery } from "./leadStatusControllerListQuery.query.generated";
import type { ListLeadStatusRequest } from "../leadstatuses/types/ListLeadStatusRequest.generated";
import type { ListLeadStatusResult } from "../leadstatuses/types/ListLeadStatusResult.generated";

export function useLeadStatusControllerListQuery(
  input: GeneratedEndpointInput<{ request: ListLeadStatusRequest; }>,
  options?: GeneratedQueryOptions<ListLeadStatusResult>,
  _config?: unknown,
) {
  return useGeneratedQuery(leadStatusControllerListQuery, input, options);
}
