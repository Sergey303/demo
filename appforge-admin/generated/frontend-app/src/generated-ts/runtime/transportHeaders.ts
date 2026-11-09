import type { HttpRequestBody } from "./httpClient";
import { TransportRuntimeError } from "./transportErrors";
import type {
  EndpointTransportBindingMetadata,
  ResolvedTransportInput,
  SupportedBodyKind,
} from "./transportTypes";
import { toHeaderString } from "./transportWireValues";

export function buildHeaders(
  metadata: EndpointTransportBindingMetadata,
  resolvedInputs: readonly ResolvedTransportInput[],
  optionHeaders: Record<string, string> | undefined,
  bodyKind: SupportedBodyKind,
  body: HttpRequestBody | undefined,
): Record<string, string> {
  const headers: Record<string, string> = { ...(optionHeaders ?? {}) };
  validateRuntimeProvidedHeaders(metadata, headers);

  for (const entry of resolvedInputs) {
    if (entry.metadata.bindingSource !== "header") {
      continue;
    }

    if (entry.value === undefined || entry.value === null) {
      continue;
    }

    headers[entry.metadata.wireName] = toHeaderString(
      entry.value,
      metadata.endpointKey,
      entry.metadata.inputKey,
    );
  }

  if (body === undefined || body === null) {
    return headers;
  }

  const requestContentType = metadata.transport.requestContentType;
  if (bodyKind === "json") {
    ensureHeader(headers, "Content-Type", requestContentType ?? "application/json");
  } else if (bodyKind === "form-url-encoded") {
    ensureHeader(headers, "Content-Type", requestContentType ?? "application/x-www-form-urlencoded");
  }

  return headers;
}


function validateRuntimeProvidedHeaders(
  metadata: EndpointTransportBindingMetadata,
  headers: Record<string, string>,
): void {
  for (const input of metadata.transport.inputs) {
    if (!input.valueSource?.startsWith("runtime-")) {
      continue;
    }
    if (input.bindingSource !== "header" || input.valueSource !== "runtime-operation-id") {
      throw new TransportRuntimeError(
        `[transportRuntime] Unsupported runtime-provided input '${input.inputKey}' for endpoint '${metadata.endpointKey}'.`,
      );
    }
    const present = Object.keys(headers).some(
      key => key.toLowerCase() === input.wireName.toLowerCase() && headers[key].length > 0,
    );
    if (input.required && !present) {
      throw new TransportRuntimeError(
        `[transportRuntime] Missing required runtime-provided header '${input.wireName}' for endpoint '${metadata.endpointKey}'.`,
      );
    }
  }
}

function ensureHeader(headers: Record<string, string>, key: string, value: string): void {
  const existing = Object.keys(headers).some(
    (currentKey) => currentKey.toLowerCase() === key.toLowerCase(),
  );
  if (!existing) {
    headers[key] = value;
  }
}
