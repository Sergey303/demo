import { useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { MutationFunctionContext, UseMutationResult } from "@tanstack/react-query";
import { invalidateEndpointKeys } from "./reactInvalidation";
import { normalizeEndpointInput } from "./reactEndpointInput";
import { useMutationLifecycle } from "./mutationLifecycleRuntime";
import { createMutationLifecycleVariables, readMutationLifecycleVariables, type RuntimeMutationVariables, unwrapRuntimeMutationVariables } from "./mutationLifecycleVariablesRuntime";
import { useOperationLifecycle } from "./operationLifecycleRuntime";
import type { MutationBinding } from "./mutationRuntime";
import type { QueryKey } from "./queryKeyRuntime";
import type { QueryBinding } from "./queryRuntime";
import type { GeneratedEndpointInput, GeneratedMutationHookResult, GeneratedMutationOptions, GeneratedQueryHookResult, GeneratedQueryOptions } from "./reactQueryTypes";
import type { TransportResponseMetadata } from "./responseMetadata";


export function useGeneratedQuery<TInput, TOutput, TError = unknown>(
  binding: QueryBinding<TInput, TOutput>,
  input: GeneratedEndpointInput<TInput>,
  options?: GeneratedQueryOptions<TOutput, TError>,
): GeneratedQueryHookResult<TInput, TOutput, TError> {
  const availability = binding.getAvailability();
  const normalizedInput = normalizeEndpointInput(input) as TInput;
  const enabled = (options?.enabled ?? true) && availability.isVisible && availability.isEnabled;
  const query = useQuery<TOutput, TError, TOutput, QueryKey>({
    ...options,
    queryKey: binding.getQueryKey(normalizedInput),
    queryFn: ({ signal }: { signal?: AbortSignal }) => binding.execute(normalizedInput, { signal }).promise,
    enabled,
  });

  const lifecycle = useOperationLifecycle<TInput, TOutput, TError>(
    binding as unknown as Parameters<typeof useOperationLifecycle<TInput, TOutput, TError>>[0],
    (raw: unknown) => normalizeEndpointInput(raw) as TInput,
  );

  return {
    ...query,
    binding,
    availability,
    isVisible: availability.isVisible,
    isEnabled: availability.isEnabled,
    disabledReason: availability.disabledReason,
    query,
    execute: (nextInput: GeneratedEndpointInput<TInput>) =>
      binding.execute(normalizeEndpointInput(nextInput) as TInput).promise,
    lifecycle,
  };
}

export function useGeneratedMutation<TInput, TOutput, TError = unknown, TContext = unknown>(
  binding: MutationBinding<TInput, TOutput>,
  options?: GeneratedMutationOptions<TInput, TOutput, TError, TContext>,
): GeneratedMutationHookResult<TInput, TOutput, TError, TContext> {
  const queryClient = useQueryClient();
  const availability = binding.getAvailability();
  const lastResponseRef = useRef<TransportResponseMetadata | null>(null);
  const affectedEndpointKeys = binding.getAffectedEndpointKeys();
  const {
    onMutate: userOnMutate,
    onSuccess: userOnSuccess,
    onError: userOnError,
    onSettled: userOnSettled,
    ...mutationOptions
  } = options ?? {};
  type PublicVariables = GeneratedEndpointInput<TInput>;
  type RuntimeVariables = RuntimeMutationVariables<PublicVariables>;

  const mutation = useMutation<TOutput, TError, RuntimeVariables, TContext>({
    ...mutationOptions,
    mutationFn: (runtimeVariables: RuntimeVariables) => {
      const lifecycleVariables = readMutationLifecycleVariables(runtimeVariables);
      const input = unwrapRuntimeMutationVariables(runtimeVariables);
      return binding.execute(normalizeEndpointInput(input) as TInput, {
        signal: lifecycleVariables?.signal,
        onResponse: (metadata) => {
          lastResponseRef.current = metadata;
          options?.onResponse?.(metadata);
        },
      }).promise;
    },
    onMutate: userOnMutate
      ? (variables: RuntimeVariables, context: MutationFunctionContext) =>
          userOnMutate(unwrapRuntimeMutationVariables(variables), context)
      : undefined,
    onSuccess: async (
      data: TOutput,
      variables: RuntimeVariables,
      context: TContext,
      mutationFunctionContext: MutationFunctionContext,
    ) => {
      const publicVariables = unwrapRuntimeMutationVariables(variables);
      await userOnSuccess?.(data, publicVariables, context, mutationFunctionContext);
      if (options?.invalidateOnSuccess !== false && affectedEndpointKeys.length > 0) {
        await invalidateEndpointKeys(queryClient, affectedEndpointKeys);
      }
    },
    onError: userOnError
      ? (
          error: TError,
          variables: RuntimeVariables,
          context: TContext | undefined,
          mutationFunctionContext: MutationFunctionContext,
        ) => userOnError(error, unwrapRuntimeMutationVariables(variables), context, mutationFunctionContext)
      : undefined,
    onSettled: userOnSettled
      ? (
          data: TOutput | undefined,
          error: TError | null,
          variables: RuntimeVariables,
          context: TContext | undefined,
          mutationFunctionContext: MutationFunctionContext,
        ) => userOnSettled(data, error, unwrapRuntimeMutationVariables(variables), context, mutationFunctionContext)
      : undefined,
  });
  const publicMutation = mutation as unknown as UseMutationResult<TOutput, TError, PublicVariables, TContext>;

  const lifecycle = useMutationLifecycle<TInput, TOutput, TError>(
    (input: TInput, signal: AbortSignal) =>
      mutation.mutateAsync(createMutationLifecycleVariables(
        normalizeEndpointInput(input) as PublicVariables,
        signal,
      )),
    (raw: unknown) => normalizeEndpointInput(raw) as TInput,
    () => binding.getAvailability(),
  );

  return {
    ...publicMutation,
    binding,
    availability,
    isVisible: availability.isVisible,
    isEnabled: availability.isEnabled,
    disabledReason: availability.disabledReason,
    mutation: publicMutation,
    execute: (input: GeneratedEndpointInput<TInput>) =>
      publicMutation.mutateAsync(input),
    lifecycle,
    lastResponse: lastResponseRef.current,
    warnings: lastResponseRef.current?.warnings ?? [],
  };
}
