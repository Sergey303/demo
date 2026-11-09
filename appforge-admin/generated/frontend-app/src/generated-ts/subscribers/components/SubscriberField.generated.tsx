// ------------------------------------------------------------------------------
// GENERATED FILE - source: subscribers/types.json
// DO NOT EDIT MANUALLY.
// ------------------------------------------------------------------------------

import { InputText } from "primereact/inputtext";
import { Calendar } from "primereact/calendar";

export type SubscriberFieldKind = "text" | "date";

export type SubscriberFieldValue = string | number | boolean | null | undefined;

export interface SubscriberFieldLookupOption {
  readonly label: string;
  readonly value: string;
}

export interface SubscriberFieldProps {
  readonly id: string;
  readonly label: string;
  readonly kind: SubscriberFieldKind;
  readonly value: SubscriberFieldValue;
  readonly onChange: (value: SubscriberFieldValue) => void;
  readonly required?: boolean;
  readonly disabled?: boolean;
  readonly error?: string | null;
  readonly helperText?: string | null;
  readonly lookupOptions?: readonly SubscriberFieldLookupOption[];
  readonly onLookupFilter?: (query: string) => void;
}

export function SubscriberField(props: SubscriberFieldProps) {
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

function renderInput(props: SubscriberFieldProps, describedBy: string | undefined) {
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

  if (props.kind === "date") {
    return (
      <Calendar
        inputId={props.id}
        value={toCalendarValue(props.value)}
        disabled={props.disabled}
        aria-describedby={describedBy}
        invalid={Boolean(props.error)}
        showIcon
        onChange={(event) => props.onChange(toDateOnlyValue(event.value))}
      />
    );
  }
  return null;
}

function toCalendarValue(value: SubscriberFieldValue) {
  if (typeof value !== "string" || value.length === 0) {
    return null;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function toDateOnlyValue(value: unknown) {
  if (!(value instanceof Date)) {
    return null;
  }

  return value.toISOString().slice(0, 10);
}
