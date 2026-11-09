import { defineMutationBinding } from "../runtime/mutationRuntime";
import { customerControllerCreateTransportMetadata } from "./customerControllerCreateTransport.transport.generated";
import type { CreateCustomerRequest } from "../customers/types/CreateCustomerRequest.generated";import type { CustomerDto } from "../customers/types/CustomerDto.generated";
export const customerControllerCreateMutation = defineMutationBinding<CreateCustomerRequest, CustomerDto>({
  endpointKey: "post:/api/customers",
  transportMetadata: customerControllerCreateTransportMetadata,
  invalidatesEndpointKeys: ["get:/api/customers", "get:/api/customers/lookup", "get:/api/customers/options/{field}", "get:/api/customers/suggest/{field}", "get:/api/customers/{id}"],
  durability: {"databaseName": "appforge-restcrud-customer-create", "payloadSchemaVersion": 821341471731109, "idempotencyHeaderName": "Idempotency-Key", "scopeKey": "post:/api/customers", "retryPolicy": {"initialDelayMs": 1500, "maxDelayMs": 30000, "multiplier": 2, "maxAttempts": 5}, "staleSendingAfterMs": 30000, "maxDeliveryAgeMs": 2419200000},
  realtimeLinks: [],
  availability: {"featureKeys": [], "policyKeys": ["Customer.Create"], "capabilityKeys": [], "providerKeys": [], "environmentScopes": [], "disabledReasonKey": null},
  errorRefs: ["customer.idempotency_conflict", "customer.idempotency_key_invalid", "customer.idempotency_key_required", "customer.validation_failed"],
});
