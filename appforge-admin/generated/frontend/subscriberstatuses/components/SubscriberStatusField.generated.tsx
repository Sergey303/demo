// ------------------------------------------------------------------------------
// GENERATED FILE - source: subscriberstatuses/types.json
// DO NOT EDIT MANUALLY.
// ------------------------------------------------------------------------------

import { InputText } from "primereact/inputtext";
import { InputNumber } from "primereact/inputnumber";

export type SubscriberStatusFieldKind = "text" | "number";

export type SubscriberStatusFieldValue = string | number | boolean | null | undefined;

export interface SubscriberStatusFieldLookupOption {
  readonly label: string;
  readonly value: string;
}

export interface SubscriberStatusFieldProps {
  readonly id: string;
  readonly label: string;
  readonly kind: SubscriberStatusFieldKind;
  readonly value: SubscriberStatusFieldValue;
  readonly onChange: (value: SubscriberStatusFieldValue) => void;
  readonly required?: boolean;
  readonly disabled?: boolean;
  readonly error?: string | null;
  readonly helperText?: string | null;
  readonly lookupOptions?: readonly SubscriberStatusFieldLookupOption[];
  readonly onLookupFilter?: (query: string) => void;
}

export function SubscriberStatusField(props: SubscriberStatusFieldProps) {
  const describedBy = props.error || props.helperText ? `${props.id}-help` : undefined;

  return (
    <div className="appforge-generated-field">
      <label className="appforge-generated-field-label" htmlFor={props.id}>
        {props.label}
        {props.required ? <span aria-hidden="true"> *</span> : null}
      </label>
      {renderInput(props, describedBy)}
      {props.error ? (
        <small id={describedBy} className="p-error">
          {props.error}
        </small>
      ) : null}
      {!props.error && props.helperText ? (
        <small id={describedBy} className="appforge-generated-field-help">
          {props.helperText}
        </small>
      ) : null}
    </div>
  );
}

function renderInput(props: SubscriberStatusFieldProps, describedBy: string | undefined) {
  if (props.kind === "text") {
    return (
      <InputText
        id={props.id}
        value={typeof props.value === "string" ? props.value : ""}
        disabled={props.disabled}
        aria-describedby={describedBy}
        invalid={Boolean(props.error)}
        onChange={(event) => props.onChange(event.target.value)}
      />
    );
  }

  if (props.kind === "number") {
    return (
      <InputNumber
        inputId={props.id}
        value={typeof props.value === "number" ? props.value : null}
        disabled={props.disabled}
        aria-describedby={describedBy}
        onValueChange={(event) => props.onChange(event.value ?? null)}
      />
    );
  }
  return null;
}
