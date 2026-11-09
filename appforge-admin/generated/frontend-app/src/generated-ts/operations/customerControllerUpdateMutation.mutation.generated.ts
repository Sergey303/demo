import { defineMutationBinding } from "../runtime/mutationRuntime";
import { customerControllerUpdateTransportMetadata } from "./customerControllerUpdateTransport.transport.generated";
import type { CustomerDto } from "../customers/types/CustomerDto.generated";import type { UpdateCustomerRequest } from "../customers/types/UpdateCustomerRequest.generated";
export const customerControllerUpdateMutation = defineMutationBinding<{ id: string; body: UpdateCustomerRequest; }, CustomerDto>({
  endpointKey: "put:/api/customers/{id}",
  transportMetadata: customerControllerUpdateTransportMetadata,
  invalidatesEndpointKeys: ["get:/api/customers", "get:/api/customers/lookup", "get:/api/customers/options/{field}", "get:/api/customers/suggest/{field}", "get:/api/customers/{id}"],
  durability: {"databaseName": "appforge-restcrud-customer-update", "payloadSchemaVersion": 3360942364862411, "idempotencyHeaderName": "Idempotency-Key", "scopeKey": "put:/api/customers/{id}", "retryPolicy": {"initialDelayMs": 1500, "maxDelayMs": 30000, "multiplier": 2, "maxAttempts": 5}, "staleSendingAfterMs": 30000, "maxDeliveryAgeMs": 2419200000},
  realtimeLinks: [],
  availability: {"featureKeys": [], "policyKeys": ["Customer.Update"], "capabilityKeys": [], "providerKeys": [], "environmentScopes": [], "disabledReasonKey": null},
  errorRefs: ["customer.idempotency_conflict", "customer.idempotency_key_invalid", "customer.idempotency_key_required", "customer.not_found", "customer.validation_failed"],
});
