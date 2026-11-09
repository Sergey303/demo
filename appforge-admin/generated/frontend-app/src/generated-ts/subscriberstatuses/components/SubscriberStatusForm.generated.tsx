// ------------------------------------------------------------------------------
// GENERATED FILE - source: subscriberstatuses/types.json
// DO NOT EDIT MANUALLY.
// ------------------------------------------------------------------------------

import { Button } from "primereact/button";
import type { CreateSubscriberStatusRequest } from "../types/CreateSubscriberStatusRequest.generated";
import type { UpdateSubscriberStatusRequest } from "../types/UpdateSubscriberStatusRequest.generated";
import { SubscriberStatusField } from "./SubscriberStatusField.generated";

export interface SubscriberStatusFormLookupOption {
  readonly label: string;
  readonly value: string;
}

interface SubscriberStatusFormBaseProps {
  readonly onSubmit: () => void;
  readonly submitLabel?: string;
  readonly submitting?: boolean;
  readonly disabled?: boolean;
  readonly lookupOptions?: Readonly<Record<string, readonly SubscriberStatusFormLookupOption[]>>;
  readonly onLookupSuggest?: (field: string, query: string) => void;
}

export type SubscriberStatusFormProps =
  | (SubscriberStatusFormBaseProps & {
      readonly mode: "create";
      readonly value: CreateSubscriberStatusRequest;
      readonly onChange: (value: CreateSubscriberStatusRequest) => void;
      readonly errors?: Partial<Record<keyof CreateSubscriberStatusRequest, string>>;
    })
  | (SubscriberStatusFormBaseProps & {
      readonly mode: "edit";
      readonly value: UpdateSubscriberStatusRequest;
      readonly onChange: (value: UpdateSubscriberStatusRequest) => void;
      readonly errors?: Partial<Record<keyof UpdateSubscriberStatusRequest, string>>;
    });

export function SubscriberStatusForm(props: SubscriberStatusFormProps) {
  const disabled = Boolean(props.disabled || props.submitting);
  const fields = props.mode === "create" ? (
    <>
      <SubscriberStatusField
        id="subscriberstatus-code"
        label="Code"
        kind="text"
        value={props.value["code"]}
        required={true}
        disabled={disabled}
        error={props.errors?.["code"] ?? null}
        onChange={(nextValue) => {
          props.onChange({
            ...props.value,
            ["code"]: nextValue as CreateSubscriberStatusRequest["code"],
          });
        }}
      />
      <SubscriberStatusField
        id="subscriberstatus-name"
        label="Name"
        kind="text"
        value={props.value["name"]}
        required={true}
        disabled={disabled}
        error={props.errors?.["name"] ?? null}
        onChange={(nextValue) => {
          props.onChange({
            ...props.value,
            ["name"]: nextValue as CreateSubscriberStatusRequest["name"],
          });
        }}
      />
      <SubscriberStatusField
        id="subscriberstatus-sortorder"
        label="Sort Order"
        kind="number"
        value={props.value["sortOrder"]}
        required={true}
        disabled={disabled}
        error={props.errors?.["sortOrder"] ?? null}
        onChange={(nextValue) => {
          props.onChange({
            ...props.value,
            ["sortOrder"]: nextValue as CreateSubscriberStatusRequest["sortOrder"],
          });
        }}
      />
    </>
  ) : (
    <>
      <SubscriberStatusField
        id="subscriberstatus-code"
        label="Code"
        kind="text"
        value={props.value["code"]}
        required={true}
        disabled={disabled}
        error={props.errors?.["code"] ?? null}
        onChange={(nextValue) => {
          props.onChange({
            ...props.value,
            ["code"]: nextValue as UpdateSubscriberStatusRequest["code"],
          });
        }}
      />
      <SubscriberStatusField
        id="subscriberstatus-name"
        label="Name"
        kind="text"
        value={props.value["name"]}
        required={true}
        disabled={disabled}
        error={props.errors?.["name"] ?? null}
        onChange={(nextValue) => {
          props.onChange({
            ...props.value,
            ["name"]: nextValue as UpdateSubscriberStatusRequest["name"],
          });
        }}
      />
      <SubscriberStatusField
        id="subscriberstatus-sortorder"
        label="Sort Order"
        kind="number"
        value={props.value["sortOrder"]}
        required={true}
        disabled={disabled}
        error={props.errors?.["sortOrder"] ?? null}
        onChange={(nextValue) => {
          props.onChange({
            ...props.value,
            ["sortOrder"]: nextValue as UpdateSubscriberStatusRequest["sortOrder"],
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
