import type {
  DurableOutbox,
  DurableOutboxEnqueue,
  DurableOutboxOptions,
  DurableOutboxRecord,
} from "./durableOutboxTypes";
import { DurableOutboxConflictError } from "./durableOutboxTypes";

const DATABASE_VERSION = 1;
const STORE_NAME = "items";
const PARTITION_INDEX = "byPartition";
const READY_INDEX = "byPartitionStatusNextAttempt";
const STALE_INDEX = "byPartitionStatusUpdatedAt";

export function createIndexedDbDurableOutbox<TPayload>(
  options: DurableOutboxOptions<TPayload>,
): DurableOutbox<TPayload> {
  requireText(options.databaseName, "databaseName");
  requirePositiveInteger(options.schemaVersion, "schemaVersion");

  const factory = options.indexedDb ?? globalThis.indexedDB;
  if (!factory) {
    throw new Error("IndexedDB is unavailable in this runtime.");
  }
  const now = options.now ?? (() => Date.now());
  let databasePromise: Promise<IDBDatabase> | undefined;

  const database = () => {
    databasePromise ??= openDatabase(factory, options.databaseName);
    return databasePromise;
  };

  const mutate = async (
    partitionKey: string,
    id: string,
    update: (item: DurableOutboxRecord<TPayload>) => void,
  ) => {
    const db = await database();
    const transaction = db.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    const item = await request<DurableOutboxRecord<TPayload> | undefined>(
      store.get(storageKey(partitionKey, id)),
    );
    if (!item) {
      throw new DurableOutboxConflictError(`Durable outbox item not found: ${id}`);
    }
    if (!isCompatible(item, options)) {
      failIncompatible(item, now());
      store.put(item);
      await completed(transaction);
      throw new DurableOutboxConflictError(
        `Durable outbox item has an incompatible schema: ${item.id}`,
      );
    }
    update(item);
    store.put(item);
    await completed(transaction);
    return item;
  };

  return {
    async enqueue(input) {
      requireText(input.id, "id");
      requireText(input.partitionKey, "partitionKey");
      requireText(input.scopeKey, "scopeKey");
      const timestamp = now();
      const db = await database();
      const transaction = db.transaction(STORE_NAME, "readwrite");
      const store = transaction.objectStore(STORE_NAME);
      const key = storageKey(input.partitionKey, input.id);
      const existing = await request<DurableOutboxRecord<TPayload> | undefined>(
        store.get(key),
      );
      const fingerprint = payloadFingerprint(input.payload);
      if (existing) {
        if (existing.scopeKey !== input.scopeKey) {
          transaction.abort();
          throw new DurableOutboxConflictError(
            `Durable outbox id is already bound to another scope: ${input.id}`,
          );
        }
        if (!isCompatible(existing, options)) {
          failIncompatible(existing, timestamp);
          store.put(existing);
          await completed(transaction);
          throw new DurableOutboxConflictError(
            `Durable outbox item has an incompatible schema: ${existing.id}`,
          );
        }
        if (existing.payloadFingerprint !== fingerprint) {
          transaction.abort();
          throw new DurableOutboxConflictError(
            `Durable outbox id is already bound to another payload: ${input.id}`,
          );
        }
        await completed(transaction);
        return existing;
      }

      const item: DurableOutboxRecord<TPayload> = {
        storageKey: key,
        id: input.id,
        partitionKey: input.partitionKey,
        scopeKey: input.scopeKey,
        schemaVersion: options.schemaVersion,
        createdAtMs: timestamp,
        updatedAtMs: timestamp,
        attempt: 0,
        nextAttemptAtMs: timestamp,
        status: "queued",
        payloadFingerprint: fingerprint,
        payload: input.payload,
      };

      store.add(item);
      await completed(transaction);
      return item;
    },

    async listReady(partitionKey, limit = 50) {
      requireText(partitionKey, "partitionKey");
      requirePositiveInteger(limit, "limit");
      const timestamp = now();
      const db = await database();
      const transaction = db.transaction(STORE_NAME, "readwrite");
      const index = transaction.objectStore(STORE_NAME).index(READY_INDEX);
      const range = IDBKeyRange.bound(
        [partitionKey, "queued", 0],
        [partitionKey, "queued", timestamp],
      );
      const items = await request<DurableOutboxRecord<TPayload>[]>(
        index.getAll(range, limit),
      );
      const ready: DurableOutboxRecord<TPayload>[] = [];
      for (const item of items) {
        if (!isCompatible(item, options)) {
          failIncompatible(item, timestamp);
          transaction.objectStore(STORE_NAME).put(item);
        } else {
          ready.push(item);
        }
      }
      await completed(transaction);
      return ready;
    },

    async listPartition(partitionKey) {
      requireText(partitionKey, "partitionKey");
      const timestamp = now();
      const db = await database();
      const transaction = db.transaction(STORE_NAME, "readwrite");
      const store = transaction.objectStore(STORE_NAME);
      const items = await request<DurableOutboxRecord<TPayload>[]>(
        store.index(PARTITION_INDEX).getAll(partitionKey),
      );
      for (const item of items) {
        if (!isCompatible(item, options)) {
          failIncompatible(item, timestamp);
          store.put(item);
        }
      }
      await completed(transaction);
      return items.sort((left, right) => left.createdAtMs - right.createdAtMs);
    },

    markSending(partitionKey, id) {
      return mutate(partitionKey, id, (item) => {
        const timestamp = now();
        if (item.status !== "queued" || item.nextAttemptAtMs > timestamp) {
          throw new DurableOutboxConflictError(
            `Durable outbox item is not ready to send: ${item.id}`,
          );
        }
        item.status = "sending";
        item.attempt += 1;
        item.lastAttemptAtMs = timestamp;
        item.updatedAtMs = timestamp;
      });
    },

    scheduleRetry(partitionKey, id, nextAttemptAtMs) {
      requireFiniteNumber(nextAttemptAtMs, "nextAttemptAtMs");
      return mutate(partitionKey, id, (item) => {
        if (item.status === "failed_final") {
          throw new DurableOutboxConflictError(
            `Final outbox item cannot be retried: ${item.id}`,
          );
        }
        item.status = "queued";
        item.nextAttemptAtMs = Math.max(now(), nextAttemptAtMs);
        item.updatedAtMs = now();
        delete item.finalErrorCode;
      });
    },

    markFailedFinal(partitionKey, id, errorCode) {
      requireText(errorCode, "errorCode");
      return mutate(partitionKey, id, (item) => {
        item.status = "failed_final";
        item.finalErrorCode = errorCode;
        item.updatedAtMs = now();
      });
    },

    async reconcile(partitionKey, id) {
      requireText(partitionKey, "partitionKey");
      requireText(id, "id");
      const db = await database();
      const transaction = db.transaction(STORE_NAME, "readwrite");
      transaction.objectStore(STORE_NAME).delete(storageKey(partitionKey, id));
      await completed(transaction);
    },

    async clearPartition(partitionKey) {
      requireText(partitionKey, "partitionKey");
      const db = await database();
      const transaction = db.transaction(STORE_NAME, "readwrite");
      const store = transaction.objectStore(STORE_NAME);
      const keys = await request<IDBValidKey[]>(
        store.index(PARTITION_INDEX).getAllKeys(partitionKey),
      );
      for (const key of keys) {
        store.delete(key);
      }
      await completed(transaction);
      return keys.length;
    },

    async clearOtherPartitions(keepPartitionKey) {
      requireText(keepPartitionKey, "keepPartitionKey");
      const db = await database();
      const transaction = db.transaction(STORE_NAME, "readwrite");
      const store = transaction.objectStore(STORE_NAME);
      const items = await request<DurableOutboxRecord<TPayload>[]>(store.getAll());
      let deleted = 0;
      for (const item of items) {
        if (item.partitionKey === keepPartitionKey) {
          continue;
        }
        store.delete(item.storageKey);
        deleted += 1;
      }
      await completed(transaction);
      return deleted;
    },

    async recoverStaleSending(partitionKey, staleBeforeMs) {
      requireText(partitionKey, "partitionKey");
      requireFiniteNumber(staleBeforeMs, "staleBeforeMs");
      const timestamp = now();
      const db = await database();
      const transaction = db.transaction(STORE_NAME, "readwrite");
      const store = transaction.objectStore(STORE_NAME);
      const index = store.index(STALE_INDEX);
      const range = IDBKeyRange.bound(
        [partitionKey, "sending", 0],
        [partitionKey, "sending", staleBeforeMs],
      );
      const items = await request<DurableOutboxRecord<TPayload>[]>(index.getAll(range));
      for (const item of items) {
        if (!isCompatible(item, options)) {
          failIncompatible(item, timestamp);
        } else {
          item.status = "queued";
          item.nextAttemptAtMs = timestamp;
          item.updatedAtMs = timestamp;
        }
        store.put(item);
      }
      await completed(transaction);
      return items.length;
    },

    close() {
      void databasePromise?.then((db) => db.close());
      databasePromise = undefined;
    },
  };
}

function openDatabase(factory: IDBFactory, name: string): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const open = factory.open(name, DATABASE_VERSION);
    open.onupgradeneeded = () => {
      const db = open.result;
      const store = db.createObjectStore(STORE_NAME, { keyPath: "storageKey" });
      store.createIndex(PARTITION_INDEX, "partitionKey");
      store.createIndex(
        READY_INDEX,
        ["partitionKey", "status", "nextAttemptAtMs"],
      );
      store.createIndex(
        STALE_INDEX,
        ["partitionKey", "status", "updatedAtMs"],
      );
    };
    open.onsuccess = () => resolve(open.result);
    open.onerror = () => reject(open.error ?? new Error("IndexedDB open failed."));
  });
}

function isCompatible<TPayload>(
  item: DurableOutboxRecord<TPayload>,
  options: DurableOutboxOptions<TPayload>,
): boolean {
  return item.schemaVersion === options.schemaVersion
    && typeof item.payloadFingerprint === "string"
    && item.payloadFingerprint === payloadFingerprint(item.payload)
    && (options.validatePayload?.(item.payload) ?? true);
}

function failIncompatible<TPayload>(
  item: DurableOutboxRecord<TPayload>,
  timestamp: number,
): void {
  item.status = "failed_final";
  item.finalErrorCode = "schema_incompatible";
  item.updatedAtMs = timestamp;
}

function storageKey(partitionKey: string, id: string): string {
  requireText(partitionKey, "partitionKey");
  requireText(id, "id");
  return `${partitionKey}\u0000${id}`;
}

function request<T>(value: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    value.onsuccess = () => resolve(value.result);
    value.onerror = () => reject(value.error ?? new Error("IndexedDB request failed."));
  });
}

function completed(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onabort = () => reject(
      transaction.error ?? new Error("IndexedDB transaction aborted."),
    );
    transaction.onerror = () => reject(
      transaction.error ?? new Error("IndexedDB transaction failed."),
    );
  });
}

function requireText(value: string, name: string): void {
  if (!value || value.trim() !== value) {
    throw new TypeError(`${name} must be a non-empty trimmed string.`);
  }
}

function requirePositiveInteger(value: number, name: string): void {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new TypeError(`${name} must be a positive integer.`);
  }
}

function requireFiniteNumber(value: number, name: string): void {
  if (!Number.isFinite(value)) {
    throw new TypeError(`${name} must be finite.`);
  }
}


function payloadFingerprint(value: unknown): string {
  return JSON.stringify(canonicalJsonValue(value));
}

function canonicalJsonValue(value: unknown): unknown {
  if (
    value === null
    || typeof value === "string"
    || typeof value === "boolean"
    || (typeof value === "number" && Number.isFinite(value))
  ) {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map(canonicalJsonValue);
  }
  if (typeof value === "object") {
    const result: Record<string, unknown> = {};
    for (const key of Object.keys(value as Record<string, unknown>).sort()) {
      const item = (value as Record<string, unknown>)[key];
      if (item === undefined) {
        continue;
      }
      result[key] = canonicalJsonValue(item);
    }
    return result;
  }
  throw new TypeError("Durable outbox payload must be JSON-compatible.");
}
