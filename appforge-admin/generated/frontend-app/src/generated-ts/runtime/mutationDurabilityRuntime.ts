export interface RegisteredDurableMutation {
  readonly endpointKey: string;
  recover(partitionKey: string): Promise<void>;
  clear(partitionKey: string): Promise<void>;
  clearOtherPartitions(keepPartitionKey: string): Promise<void>;
}

let partitionKey: string | null = null;
const registrations = new Map<string, RegisteredDurableMutation>();

export function getMutationDurabilityPartition(): string | null {
  return partitionKey;
}

export function requireMutationDurabilityPartition(): string {
  if (!partitionKey) {
    throw new Error(
      "Mutation durability partition is unavailable. Configure it from authenticated browser state.",
    );
  }
  return partitionKey;
}

export function registerDurableMutation(registration: RegisteredDurableMutation): void {
  registrations.set(registration.endpointKey, registration);
  if (partitionKey) {
    void activateRegistration(registration, partitionKey);
  }
}

export function configureMutationDurabilityPartition(nextPartitionKey: string | null): void {
  const normalized = normalizePartition(nextPartitionKey);
  if (normalized === partitionKey) {
    return;
  }
  partitionKey = normalized;

  if (partitionKey) {
    for (const registration of registrations.values()) {
      void activateRegistration(registration, partitionKey);
    }
  }
}

async function activateRegistration(
  registration: RegisteredDurableMutation,
  activePartitionKey: string,
): Promise<void> {
  await registration.clearOtherPartitions(activePartitionKey);
  if (partitionKey === activePartitionKey) {
    await registration.recover(activePartitionKey);
  }
}

export async function clearMutationDurabilityPartition(targetPartitionKey: string): Promise<void> {
  const normalized = normalizePartition(targetPartitionKey);
  if (!normalized) {
    return;
  }
  await Promise.all(
    Array.from(registrations.values(), registration => registration.clear(normalized)),
  );
}

function normalizePartition(value: string | null): string | null {
  if (value === null) {
    return null;
  }
  const normalized = value.trim();
  if (!normalized) {
    throw new TypeError("Mutation durability partition must be non-empty when configured.");
  }
  return normalized;
}
