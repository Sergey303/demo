// ------------------------------------------------------------------------------
// GENERATED FILE - source: subscribers/types.json
// DO NOT EDIT MANUALLY.
// ------------------------------------------------------------------------------

import { Button } from "primereact/button";
import type { CreateSubscriberRequest } from "../types/CreateSubscriberRequest.generated";
import type { UpdateSubscriberRequest } from "../types/UpdateSubscriberRequest.generated";
import { SubscriberField } from "./SubscriberField.generated";

export interface SubscriberFormLookupOption {
  readonly label: string;
  readonly value: string;
}

interface SubscriberFormBaseProps {
  readonly onSubmit: () => void;
  readonly submitLabel?: string;
  readonly submitting?: boolean;
  readonly disabled?: boolean;
  readonly lookupOptions?: Readonly<Record<string, readonly SubscriberFormLookupOption[]>>;
  readonly onLookupSuggest?: (field: string, query: string) => void;
}

export type SubscriberFormProps =
  | (SubscriberFormBaseProps & {
      readonly mode: "create";
      readonly value: CreateSubscriberRequest;
      readonly onChange: (value: CreateSubscriberRequest) => void;
      readonly errors?: Partial<Record<keyof CreateSubscriberRequest, string>>;
    })
  | (SubscriberFormBaseProps & {
      readonly mode: "edit";
      readonly value: UpdateSubscriberRequest;
      readonly onChange: (value: UpdateSubscriberRequest) => void;
      readonly errors?: Partial<Record<keyof UpdateSubscriberRequest, string>>;
    });

export function SubscriberForm(props: SubscriberFormProps) {
  const disabled = Boolean(props.disabled || props.submitting);
  const fields = props.mode === "create" ? (
    <>
      <SubscriberField
        id="subscriber-displayname"
        label="Display Name"
        kind="text"
        value={props.value["displayName"]}
        required={true}
        disabled={disabled}
        error={props.errors?.["displayName"] ?? null}
        onChange={(nextValue) => {
          props.onChange({
            ...props.value,
            ["displayName"]: nextValue as CreateSubscriberRequest["displayName"],
          });
        }}
      />
      <SubscriberField
        id="subscriber-handle"
        label="Handle"
        kind="text"
        value={props.value["handle"]}
        required={true}
        disabled={disabled}
        error={props.errors?.["handle"] ?? null}
        onChange={(nextValue) => {
          props.onChange({
            ...props.value,
            ["handle"]: nextValue as CreateSubscriberRequest["handle"],
          });
        }}
      />
      <SubscriberField
        id="subscriber-joinedat"
        label="Joined At"
        kind="date"
        value={props.value["joinedAt"]}
        required={true}
        disabled={disabled}
        error={props.errors?.["joinedAt"] ?? null}
        onChange={(nextValue) => {
          props.onChange({
            ...props.value,
            ["joinedAt"]: nextValue as CreateSubscriberRequest["joinedAt"],
          });
        }}
      />
      <SubscriberField
        id="subscriber-note"
        label="Note"
        kind="text"
        value={props.value["note"]}
        required={false}
        disabled={disabled}
        error={props.errors?.["note"] ?? null}
        onChange={(nextValue) => {
          props.onChange({
            ...props.value,
            ["note"]: nextValue as CreateSubscriberRequest["note"],
          });
        }}
      />
      <SubscriberField
        id="subscriber-statusid"
        label="Status Id"
        kind="text"
        value={props.value["statusId"]}
        required={true}
        disabled={disabled}
        error={props.errors?.["statusId"] ?? null}
        onChange={(nextValue) => {
          props.onChange({
            ...props.value,
            ["statusId"]: nextValue as CreateSubscriberRequest["statusId"],
          });
        }}
      />
    </>
  ) : (
    <>
      <SubscriberField
        id="subscriber-displayname"
        label="Display Name"
        kind="text"
        value={props.value["displayName"]}
        required={true}
        disabled={disabled}
        error={props.errors?.["displayName"] ?? null}
        onChange={(nextValue) => {
          props.onChange({
            ...props.value,
            ["displayName"]: nextValue as UpdateSubscriberRequest["displayName"],
          });
        }}
      />
      <SubscriberField
        id="subscriber-handle"
        label="Handle"
        kind="text"
        value={props.value["handle"]}
        required={true}
        disabled={disabled}
        error={props.errors?.["handle"] ?? null}
        onChange={(nextValue) => {
          props.onChange({
            ...props.value,
            ["handle"]: nextValue as UpdateSubscriberRequest["handle"],
          });
        }}
      />
      <SubscriberField
        id="subscriber-joinedat"
        label="Joined At"
        kind="date"
        value={props.value["joinedAt"]}
        required={true}
        disabled={disabled}
        error={props.errors?.["joinedAt"] ?? null}
        onChange={(nextValue) => {
          props.onChange({
            ...props.value,
            ["joinedAt"]: nextValue as UpdateSubscriberRequest["joinedAt"],
          });
        }}
      />
      <SubscriberField
        id="subscriber-note"
        label="Note"
        kind="text"
        value={props.value["note"]}
        required={false}
        disabled={disabled}
        error={props.errors?.["note"] ?? null}
        onChange={(nextValue) => {
          props.onChange({
            ...props.value,
            ["note"]: nextValue as UpdateSubscriberRequest["note"],
          });
        }}
      />
      <SubscriberField
        id="subscriber-statusid"
        label="Status Id"
        kind="text"
        value={props.value["statusId"]}
        required={true}
        disabled={disabled}
        error={props.errors?.["statusId"] ?? null}
        onChange={(nextValue) => {
          props.onChange({
            ...props.value,
            ["statusId"]: nextValue as UpdateSubscriberRequest["statusId"],
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
