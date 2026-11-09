export type DurableOutboxStatus = "queued" | "sending" | "failed_final";

export interface DurableOutboxRecord<TPayload> {
  storageKey: string;
  id: string;
  partitionKey: string;
  scopeKey: string;
  schemaVersion: number;
  createdAtMs: number;
  updatedAtMs: number;
  attempt: number;
  nextAttemptAtMs: number;
  lastAttemptAtMs?: number;
  status: DurableOutboxStatus;
  finalErrorCode?: string;
  payloadFingerprint: string;
  payload: TPayload;
}

export interface DurableOutboxEnqueue<TPayload> {
  id: string;
  partitionKey: string;
  scopeKey: string;
  payload: TPayload;
}

export interface DurableOutboxOptions<TPayload> {
  databaseName: string;
  schemaVersion: number;
  indexedDb?: IDBFactory;
  now?: () => number;
  validatePayload?: (payload: unknown) => payload is TPayload;
}

export interface DurableOutbox<TPayload> {
  enqueue(input: DurableOutboxEnqueue<TPayload>): Promise<DurableOutboxRecord<TPayload>>;
  listReady(partitionKey: string, limit?: number): Promise<readonly DurableOutboxRecord<TPayload>[]>;
  listPartition(partitionKey: string): Promise<readonly DurableOutboxRecord<TPayload>[]>;
  markSending(partitionKey: string, id: string): Promise<DurableOutboxRecord<TPayload>>;
  scheduleRetry(partitionKey: string, id: string, nextAttemptAtMs: number): Promise<DurableOutboxRecord<TPayload>>;
  markFailedFinal(partitionKey: string, id: string, errorCode: string): Promise<DurableOutboxRecord<TPayload>>;
  reconcile(partitionKey: string, id: string): Promise<void>;
  clearPartition(partitionKey: string): Promise<number>;
  clearOtherPartitions(keepPartitionKey: string): Promise<number>;
  recoverStaleSending(partitionKey: string, staleBeforeMs: number): Promise<number>;
  close(): void;
}

export class DurableOutboxConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DurableOutboxConflictError";
  }
}
