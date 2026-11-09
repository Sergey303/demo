// ------------------------------------------------------------------------------
// GENERATED FILE - source: customers/types.json
// DO NOT EDIT MANUALLY.
// ------------------------------------------------------------------------------

import { Button } from "primereact/button";
import type { CreateCustomerRequest } from "../types/CreateCustomerRequest.generated";
import type { UpdateCustomerRequest } from "../types/UpdateCustomerRequest.generated";
import { CustomerField } from "./CustomerField.generated";

export interface CustomerFormLookupOption {
  readonly label: string;
  readonly value: string;
}

interface CustomerFormBaseProps {
  readonly onSubmit: () => void;
  readonly submitLabel?: string;
  readonly submitting?: boolean;
  readonly disabled?: boolean;
  readonly lookupOptions?: Readonly<Record<string, readonly CustomerFormLookupOption[]>>;
  readonly onLookupSuggest?: (field: string, query: string) => void;
}

export type CustomerFormProps =
  | (CustomerFormBaseProps & {
      readonly mode: "create";
      readonly value: CreateCustomerRequest;
      readonly onChange: (value: CreateCustomerRequest) => void;
      readonly errors?: Partial<Record<keyof CreateCustomerRequest, string>>;
    })
  | (CustomerFormBaseProps & {
      readonly mode: "edit";
      readonly value: UpdateCustomerRequest;
      readonly onChange: (value: UpdateCustomerRequest) => void;
      readonly errors?: Partial<Record<keyof UpdateCustomerRequest, string>>;
    });

export function CustomerForm(props: CustomerFormProps) {
  const disabled = Boolean(props.disabled || props.submitting);
  const fields = props.mode === "create" ? (
    <>
      <CustomerField
        id="customer-email"
        label="Email"
        kind="text"
        value={props.value["email"]}
        required={false}
        disabled={disabled}
        error={props.errors?.["email"] ?? null}
        onChange={(nextValue) => {
          props.onChange({
            ...props.value,
            ["email"]: nextValue as CreateCustomerRequest["email"],
          });
        }}
      />
      <CustomerField
        id="customer-name"
        label="Name"
        kind="text"
        value={props.value["name"]}
        required={true}
        disabled={disabled}
        error={props.errors?.["name"] ?? null}
        onChange={(nextValue) => {
          props.onChange({
            ...props.value,
            ["name"]: nextValue as CreateCustomerRequest["name"],
          });
        }}
      />
      <CustomerField
        id="customer-note"
        label="Note"
        kind="text"
        value={props.value["note"]}
        required={false}
        disabled={disabled}
        error={props.errors?.["note"] ?? null}
        onChange={(nextValue) => {
          props.onChange({
            ...props.value,
            ["note"]: nextValue as CreateCustomerRequest["note"],
          });
        }}
      />
      <CustomerField
        id="customer-segment"
        label="Segment"
        kind="text"
        value={props.value["segment"]}
        required={false}
        disabled={disabled}
        error={props.errors?.["segment"] ?? null}
        onChange={(nextValue) => {
          props.onChange({
            ...props.value,
            ["segment"]: nextValue as CreateCustomerRequest["segment"],
          });
        }}
      />
    </>
  ) : (
    <>
      <CustomerField
        id="customer-email"
        label="Email"
        kind="text"
        value={props.value["email"]}
        required={false}
        disabled={disabled}
        error={props.errors?.["email"] ?? null}
        onChange={(nextValue) => {
          props.onChange({
            ...props.value,
            ["email"]: nextValue as UpdateCustomerRequest["email"],
          });
        }}
      />
      <CustomerField
        id="customer-name"
        label="Name"
        kind="text"
        value={props.value["name"]}
        required={true}
        disabled={disabled}
        error={props.errors?.["name"] ?? null}
        onChange={(nextValue) => {
          props.onChange({
            ...props.value,
            ["name"]: nextValue as UpdateCustomerRequest["name"],
          });
        }}
      />
      <CustomerField
        id="customer-note"
        label="Note"
        kind="text"
        value={props.value["note"]}
        required={false}
        disabled={disabled}
        error={props.errors?.["note"] ?? null}
        onChange={(nextValue) => {
          props.onChange({
            ...props.value,
            ["note"]: nextValue as UpdateCustomerRequest["note"],
          });
        }}
      />
      <CustomerField
        id="customer-segment"
        label="Segment"
        kind="text"
        value={props.value["segment"]}
        required={false}
        disabled={disabled}
        error={props.errors?.["segment"] ?? null}
        onChange={(nextValue) => {
          props.onChange({
            ...props.value,
            ["segment"]: nextValue as UpdateCustomerRequest["segment"],
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
