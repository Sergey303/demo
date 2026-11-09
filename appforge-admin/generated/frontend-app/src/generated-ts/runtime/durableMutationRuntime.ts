import { createIndexedDbDurableOutbox } from "./durableOutboxRuntime";
import type { DurableOutboxRecord } from "./durableOutboxTypes";
import { mapUnknownError } from "./errorRuntime";
import type { FrontendDomainError } from "./errorTypes";
import { getMutationDurabilityPartition, requireMutationDurabilityPartition } from "./mutationDurabilityRuntime";
import type { TransportCallOptions } from "./transportTypes";

export interface BrowserDurableMutationDescriptor {
  databaseName: string;
  payloadSchemaVersion: number;
  idempotencyHeaderName: string;
  scopeKey: string;
  retryPolicy: {
    initialDelayMs: number;
    maxDelayMs: number;
    multiplier: number;
    maxAttempts: number;
  };
  staleSendingAfterMs: number;
  maxDeliveryAgeMs: number;
}

export interface DurableMutationExecutor<TInput, TOutput> {
  execute(input: TInput, options?: TransportCallOptions): Promise<TOutput>;
  recover(partitionKey: string): Promise<void>;
  clear(partitionKey: string): Promise<void>;
  clearOtherPartitions(keepPartitionKey: string): Promise<void>;
}
export function createDurableMutationExecutor<TInput, TOutput>(
  endpointKey: string,
  descriptor: BrowserDurableMutationDescriptor,
  transport: (input: TInput, options?: TransportCallOptions) => Promise<TOutput>,
  errorRefs: readonly string[],
): DurableMutationExecutor<TInput, TOutput> {
  const outbox = createIndexedDbDurableOutbox<TInput>({
    databaseName: descriptor.databaseName,
    schemaVersion: descriptor.payloadSchemaVersion,
  });
  const inFlight = new Map<string, Promise<TOutput>>();
  const drainPromises = new Map<string, Promise<void>>();
  const drainAgain = new Set<string>();
  const recoveryTimers = new Map<string, ReturnType<typeof setTimeout>>();

  async function enqueue(
    partitionKey: string,
    input: TInput,
  ): Promise<DurableOutboxRecord<TInput>> {
    return outbox.enqueue({
      id: createOperationId(),
      partitionKey,
      scopeKey: descriptor.scopeKey,
      payload: input,
    });
  }
  async function sendRecord(
    partitionKey: string,
    record: DurableOutboxRecord<TInput>,
    options?: TransportCallOptions,
  ): Promise<TOutput> {
    if (record.scopeKey !== descriptor.scopeKey) {
      throw new Error(
        `Durable mutation scope mismatch for endpoint '${endpointKey}': '${record.scopeKey}'.`,
      );
    }
    const active = inFlight.get(record.id);
    if (active) {
      return active;
    }
    if (Date.now() - record.createdAtMs >= descriptor.maxDeliveryAgeMs) {
      await outbox.markFailedFinal(partitionKey, record.id, "delivery_window_expired");
      throw new Error(
        `Durable mutation delivery window expired for endpoint '${endpointKey}'.`,
      );
    }

    const promise = sendUntilSettled(partitionKey, record, options)
      .finally(() => {
        inFlight.delete(record.id);
      });
    inFlight.set(record.id, promise);
    return promise;
  }

  async function sendUntilSettled(
    partitionKey: string,
    initialRecord: DurableOutboxRecord<TInput>,
    options?: TransportCallOptions,
  ): Promise<TOutput> {
    let current = initialRecord;
    while (true) {
      ensureActivePartition(partitionKey);
      const claimed = current.status === "queued"
        ? await outbox.markSending(partitionKey, current.id)
        : current;
      if (getMutationDurabilityPartition() !== partitionKey) {
        await outbox.scheduleRetry(partitionKey, claimed.id, Date.now());
        throw new Error("Durable mutation delivery is paused for an inactive account partition.");
      }
      try {
        const result = await transport(claimed.payload, {
          ...options,
          signal: undefined,
          headers: withRuntimeIdempotencyHeader(
            options?.headers,
            descriptor.idempotencyHeaderName,
            claimed.id,
          ),
        });
        await outbox.reconcile(partitionKey, claimed.id);
        return result;
      } catch (error) {
        const mapped = mapUnknownError(error, errorRefs) as FrontendDomainError;
        if (getMutationDurabilityPartition() !== partitionKey) {
          await outbox.scheduleRetry(partitionKey, claimed.id, Date.now());
          throw mapped;
        }
        if (isAuthenticationUnavailable(mapped)) {
          await outbox.scheduleRetry(partitionKey, claimed.id, Date.now());
          throw mapped;
        }
        if (!isRetryable(mapped) || claimed.attempt >= descriptor.retryPolicy.maxAttempts) {
          await outbox.markFailedFinal(
            partitionKey,
            claimed.id,
            mapped.errorCode || "mutation_failed_final",
          );
          throw mapped;
        }

        const delayMs = retryDelayMs(claimed.attempt, descriptor);
        current = await outbox.scheduleRetry(
          partitionKey,
          claimed.id,
          Date.now() + delayMs,
        );
        await delay(delayMs);
      }
    }
  }
  async function drain(partitionKey: string): Promise<void> {
    if (getMutationDurabilityPartition() !== partitionKey) {
      return;
    }
    const running = drainPromises.get(partitionKey);
    if (running) {
      drainAgain.add(partitionKey);
      return running;
    }

    const promise = (async () => {
      clearRecoveryTimer(partitionKey);
      await outbox.recoverStaleSending(
        partitionKey,
        Date.now() - descriptor.staleSendingAfterMs,
      );
      const ready = await outbox.listReady(partitionKey, 50);
      for (const record of ready) {
        try {
          await sendRecord(partitionKey, record);
        } catch {
          // The durable record already owns its final state.
        }
      }
      scheduleFutureRecovery(partitionKey, await outbox.listPartition(partitionKey));
    })().finally(() => {
      drainPromises.delete(partitionKey);
      if (drainAgain.delete(partitionKey)
          && getMutationDurabilityPartition() === partitionKey) {
        void drain(partitionKey);
      }
    });
    drainPromises.set(partitionKey, promise);
    return promise;
  }


  function ensureActivePartition(expectedPartitionKey: string): void {
    if (getMutationDurabilityPartition() !== expectedPartitionKey) {
      throw new Error("Durable mutation delivery is paused for an inactive account partition.");
    }
  }

  function scheduleFutureRecovery(
    partitionKey: string,
    records: readonly DurableOutboxRecord<TInput>[],
  ): void {
    const now = Date.now();
    const future = records.flatMap(record => {
      if (record.status === "queued" && record.nextAttemptAtMs > now) {
        return [record.nextAttemptAtMs];
      }
      if (record.status === "sending") {
        return [record.updatedAtMs + descriptor.staleSendingAfterMs];
      }
      return [];
    });
    if (future.length === 0) {
      return;
    }
    const delayMs = Math.max(0, Math.min(...future) - now);
    recoveryTimers.set(partitionKey, setTimeout(() => {
      recoveryTimers.delete(partitionKey);
      void drain(partitionKey);
    }, delayMs));
  }

  function clearRecoveryTimer(partitionKey: string): void {
    const timer = recoveryTimers.get(partitionKey);
    if (timer !== undefined) {
      clearTimeout(timer);
      recoveryTimers.delete(partitionKey);
    }
  }

  return {
    async execute(input, options) {
      const partitionKey = requireMutationDurabilityPartition();
      const record = await enqueue(partitionKey, input);
      return sendRecord(partitionKey, record, options);
    },
    recover(partitionKey) {
      return drain(partitionKey);
    },
    async clear(partitionKey) {
      clearRecoveryTimer(partitionKey);
      await outbox.clearPartition(partitionKey);
    },
    async clearOtherPartitions(keepPartitionKey) {
      await outbox.clearOtherPartitions(keepPartitionKey);
    },
  };
}

function withRuntimeIdempotencyHeader(
  headers: Record<string, string> | undefined,
  headerName: string,
  operationId: string,
): Record<string, string> {
  const result: Record<string, string> = {};
  const normalizedName = headerName.toLowerCase();
  for (const [key, value] of Object.entries(headers ?? {})) {
    if (key.toLowerCase() !== normalizedName) {
      result[key] = value;
    }
  }
  result[headerName] = operationId;
  return result;
}

function isAuthenticationUnavailable(error: FrontendDomainError): boolean {
  return error.httpStatus === 401
    || error.errorCode === "auth.authentication_required"
    || error.errorCode === "authentication_required";
}

function isRetryable(error: FrontendDomainError): boolean {
  return error.retryable === true
    || error.errorCode === "network_unavailable"
    || error.errorCode === "unknown_error"
    || error.errorCode === "rate_limited"
    || (typeof error.httpStatus === "number" && error.httpStatus >= 500);
}

function retryDelayMs(
  attempt: number,
  descriptor: BrowserDurableMutationDescriptor,
): number {
  const exponent = Math.max(0, attempt - 1);
  return Math.min(
    descriptor.retryPolicy.maxDelayMs,
    Math.round(
      descriptor.retryPolicy.initialDelayMs
        * Math.pow(descriptor.retryPolicy.multiplier, exponent),
    ),
  );
}
function delay(delayMs: number): Promise<void> {
  return new Promise(resolve => {
    setTimeout(resolve, Math.max(0, delayMs));
  });
}

function createOperationId(): string {
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }
  throw new Error("crypto.randomUUID is required for durable mutation identity.");
}
