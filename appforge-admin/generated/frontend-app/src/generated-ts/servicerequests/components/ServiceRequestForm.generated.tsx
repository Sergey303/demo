// ------------------------------------------------------------------------------
// GENERATED FILE - source: servicerequests/types.json
// DO NOT EDIT MANUALLY.
// ------------------------------------------------------------------------------

import { Button } from "primereact/button";
import type { CreateServiceRequestRequest } from "../types/CreateServiceRequestRequest.generated";
import type { UpdateServiceRequestRequest } from "../types/UpdateServiceRequestRequest.generated";
import { ServiceRequestField } from "./ServiceRequestField.generated";

export interface ServiceRequestFormLookupOption {
  readonly label: string;
  readonly value: string;
}

interface ServiceRequestFormBaseProps {
  readonly onSubmit: () => void;
  readonly submitLabel?: string;
  readonly submitting?: boolean;
  readonly disabled?: boolean;
  readonly lookupOptions?: Readonly<Record<string, readonly ServiceRequestFormLookupOption[]>>;
  readonly onLookupSuggest?: (field: string, query: string) => void;
}

export type ServiceRequestFormProps =
  | (ServiceRequestFormBaseProps & {
      readonly mode: "create";
      readonly value: CreateServiceRequestRequest;
      readonly onChange: (value: CreateServiceRequestRequest) => void;
      readonly errors?: Partial<Record<keyof CreateServiceRequestRequest, string>>;
    })
  | (ServiceRequestFormBaseProps & {
      readonly mode: "edit";
      readonly value: UpdateServiceRequestRequest;
      readonly onChange: (value: UpdateServiceRequestRequest) => void;
      readonly errors?: Partial<Record<keyof UpdateServiceRequestRequest, string>>;
    });

export function ServiceRequestForm(props: ServiceRequestFormProps) {
  const disabled = Boolean(props.disabled || props.submitting);
  const fields = props.mode === "create" ? (
    <>
      <ServiceRequestField
        id="servicerequest-customerid"
        label="Customer Id"
        kind="text"
        value={props.value["customerId"]}
        required={true}
        disabled={disabled}
        error={props.errors?.["customerId"] ?? null}
        onChange={(nextValue) => {
          props.onChange({
            ...props.value,
            ["customerId"]: nextValue as CreateServiceRequestRequest["customerId"],
          });
        }}
      />
      <ServiceRequestField
        id="servicerequest-description"
        label="Description"
        kind="text"
        value={props.value["description"]}
        required={false}
        disabled={disabled}
        error={props.errors?.["description"] ?? null}
        onChange={(nextValue) => {
          props.onChange({
            ...props.value,
            ["description"]: nextValue as CreateServiceRequestRequest["description"],
          });
        }}
      />
      <ServiceRequestField
        id="servicerequest-priority"
        label="Priority"
        kind="text"
        value={props.value["priority"]}
        required={false}
        disabled={disabled}
        error={props.errors?.["priority"] ?? null}
        onChange={(nextValue) => {
          props.onChange({
            ...props.value,
            ["priority"]: nextValue as CreateServiceRequestRequest["priority"],
          });
        }}
      />
      <ServiceRequestField
        id="servicerequest-title"
        label="Title"
        kind="text"
        value={props.value["title"]}
        required={true}
        disabled={disabled}
        error={props.errors?.["title"] ?? null}
        onChange={(nextValue) => {
          props.onChange({
            ...props.value,
            ["title"]: nextValue as CreateServiceRequestRequest["title"],
          });
        }}
      />
    </>
  ) : (
    <>
      <ServiceRequestField
        id="servicerequest-customerid"
        label="Customer Id"
        kind="text"
        value={props.value["customerId"]}
        required={true}
        disabled={disabled}
        error={props.errors?.["customerId"] ?? null}
        onChange={(nextValue) => {
          props.onChange({
            ...props.value,
            ["customerId"]: nextValue as UpdateServiceRequestRequest["customerId"],
          });
        }}
      />
      <ServiceRequestField
        id="servicerequest-description"
        label="Description"
        kind="text"
        value={props.value["description"]}
        required={false}
        disabled={disabled}
        error={props.errors?.["description"] ?? null}
        onChange={(nextValue) => {
          props.onChange({
            ...props.value,
            ["description"]: nextValue as UpdateServiceRequestRequest["description"],
          });
        }}
      />
      <ServiceRequestField
        id="servicerequest-priority"
        label="Priority"
        kind="text"
        value={props.value["priority"]}
        required={false}
        disabled={disabled}
        error={props.errors?.["priority"] ?? null}
        onChange={(nextValue) => {
          props.onChange({
            ...props.value,
            ["priority"]: nextValue as UpdateServiceRequestRequest["priority"],
          });
        }}
      />
      <ServiceRequestField
        id="servicerequest-title"
        label="Title"
        kind="text"
        value={props.value["title"]}
        required={true}
        disabled={disabled}
        error={props.errors?.["title"] ?? null}
        onChange={(nextValue) => {
          props.onChange({
            ...props.value,
            ["title"]: nextValue as UpdateServiceRequestRequest["title"],
          });
        }}
      />
    </>
  );

  return (
    <form
      className="appforge-generated-form"
      onSubmit={(event) => {
        event.preventDefault();
        props.onSubmit();
      }}
    >
      {fields}
      <div className="appforge-generated-form-actions">
        <Button
          type="submit"
          label={props.submitLabel ?? "Save"}
          loading={props.submitting}
          disabled={disabled}
        />
      </div>
    </form>
  );
}
