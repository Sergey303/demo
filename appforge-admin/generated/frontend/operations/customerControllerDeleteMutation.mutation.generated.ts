import { defineMutationBinding } from "../runtime/mutationRuntime";
import { customerControllerDeleteTransportMetadata } from "./customerControllerDeleteTransport.transport.generated";

export const customerControllerDeleteMutation = defineMutationBinding<{ id: string; }, void>({
  endpointKey: "delete:/api/customers/{id}",
  transportMetadata: customerControllerDeleteTransportMetadata,
  invalidatesEndpointKeys: ["get:/api/customers", "get:/api/customers/lookup", "get:/api/customers/options/{field}", "get:/api/customers/suggest/{field}", "get:/api/customers/{id}"],
  durability: {"databaseName": "appforge-restcrud-customer-delete", "payloadSchemaVersion": 6767524602962193, "idempotencyHeaderName": "Idempotency-Key", "scopeKey": "delete:/api/customers/{id}", "retryPolicy": {"initialDelayMs": 1500, "maxDelayMs": 30000, "multiplier": 2, "maxAttempts": 5}, "staleSendingAfterMs": 30000, "maxDeliveryAgeMs": 2419200000},
  realtimeLinks: [],
  availability: {"featureKeys": [], "policyKeys": ["Customer.Delete"], "capabilityKeys": [], "providerKeys": [], "environmentScopes": [], "disabledReasonKey": null},
  errorRefs: ["customer.idempotency_conflict", "customer.idempotency_key_invalid", "customer.idempotency_key_required", "customer.not_found"],
});
