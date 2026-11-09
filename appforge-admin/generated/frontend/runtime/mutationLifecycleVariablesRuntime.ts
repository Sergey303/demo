const mutationLifecycleVariablesMarker = Symbol('appforge.mutationLifecycleVariables');

export type MutationLifecycleVariables<TInput> = {
  readonly [mutationLifecycleVariablesMarker]: true;
  readonly input: TInput;
  readonly signal: AbortSignal;
};

export type RuntimeMutationVariables<TInput> = TInput | MutationLifecycleVariables<TInput>;

export function createMutationLifecycleVariables<TInput>(
  input: TInput,
  signal: AbortSignal,
): MutationLifecycleVariables<TInput> {
  return {
    [mutationLifecycleVariablesMarker]: true,
    input,
    signal,
  };
}

export function readMutationLifecycleVariables<TInput>(
  variables: RuntimeMutationVariables<TInput>,
): MutationLifecycleVariables<TInput> | null {
  if (typeof variables !== 'object' || variables === null) return null;
  const tagged = variables as { [mutationLifecycleVariablesMarker]?: unknown };
  return tagged[mutationLifecycleVariablesMarker] === true
    ? variables as MutationLifecycleVariables<TInput>
    : null;
}

export function unwrapRuntimeMutationVariables<TInput>(
  variables: RuntimeMutationVariables<TInput>,
): TInput {
  return readMutationLifecycleVariables(variables)?.input ?? variables as TInput;
}
