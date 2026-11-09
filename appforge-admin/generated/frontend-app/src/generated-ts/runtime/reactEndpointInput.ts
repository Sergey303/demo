
import type { GeneratedEndpointInput } from "./reactQueryTypes";

export function normalizeEndpointInput<TInput>(input: GeneratedEndpointInput<TInput>): unknown {
  if (!isRecord(input)) {
    return input;
  }

  const hasArgs = isRecord(input.args);
  const hasRequest = Object.prototype.hasOwnProperty.call(input, "request");
  if (!hasArgs && !hasRequest) {
    return input;
  }

  if (hasArgs) {
    const normalized: Record<string, unknown> = { ...input.args };
    if (hasRequest) {
      normalized.body = input.request;
    }
    return normalized;
  }

  const { request, ...rest } = input;
  if (Object.keys(rest).length === 0) {
    return request;
  }

  return {
    ...rest,
    body: request,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

/**
 * A GET endpoint can declare a complex [FromQuery] parameter literally named
 * "request". Preserve that binding key when adapting the React hook input;
 * the mutation-style normalization would wrongly turn { request: filters }
 * into filters, causing transportInputs to reject a missing query argument.
 * The legacy { args, request } shape keeps route args alongside the query.
 */
export function normalizeQueryEndpointInput<TInput>(
  input: GeneratedEndpointInput<TInput>,
  endpointKey: string,
): unknown {
  if (endpointKey.startsWith("get:") && isRecord(input) &&
      Object.prototype.hasOwnProperty.call(input, "request")) {
    const args = isRecord(input.args) ? input.args : {};
    const { args: _args, ...rest } = input;
    return { ...args, ...rest };
  }
  return normalizeEndpointInput(input);
}
