// ------------------------------------------------------------------------------
// GENERATED FILE - source: servicerequests/types.json
// DO NOT EDIT MANUALLY.
// ------------------------------------------------------------------------------

import { InputText } from "primereact/inputtext";

export type ServiceRequestFieldKind = "text";

export type ServiceRequestFieldValue = string | number | boolean | null | undefined;

export interface ServiceRequestFieldLookupOption {
  readonly label: string;
  readonly value: string;
}

export interface ServiceRequestFieldProps {
  readonly id: string;
  readonly label: string;
  readonly kind: ServiceRequestFieldKind;
  readonly value: ServiceRequestFieldValue;
  readonly onChange: (value: ServiceRequestFieldValue) => void;
  readonly required?: boolean;
  readonly disabled?: boolean;
  readonly error?: string | null;
  readonly helperText?: string | null;
  readonly lookupOptions?: readonly ServiceRequestFieldLookupOption[];
  readonly onLookupFilter?: (query: string) => void;
}

export function ServiceRequestField(props: ServiceRequestFieldProps) {
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

function renderInput(props: ServiceRequestFieldProps, describedBy: string | undefined) {
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
  return null;
}
