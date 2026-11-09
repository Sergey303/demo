import type { ActionBinding } from "./actionRuntime";
import type { GeneratedActionHookResult, GeneratedActionOptions, GeneratedEndpointInput } from "./reactQueryTypes";
import { useGeneratedMutation } from "./reactQueryRuntime";

export function useGeneratedAction<TInput, TOutput, TError = unknown, TContext = unknown>(
  binding: ActionBinding<TInput, TOutput>,
  options?: GeneratedActionOptions<TInput, TOutput, TError, TContext>,
): GeneratedActionHookResult<TInput, TOutput, TError, TContext> {
  const result = useGeneratedMutation<TInput, TOutput, TError, TContext>(binding, options);
  return {
    ...result,
    binding,
    action: result.mutation,
    redirect: (input?: GeneratedEndpointInput<TInput>) => {
      result.mutation.mutate(input as GeneratedEndpointInput<TInput>);
    },
  };
}
