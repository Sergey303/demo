// ------------------------------------------------------------------------------
// GENERATED FILE - source: leadstatuses/types.json
// DO NOT EDIT MANUALLY.
// ------------------------------------------------------------------------------

import { Button } from "primereact/button";
import type { CreateLeadStatusRequest } from "../types/CreateLeadStatusRequest.generated";
import type { UpdateLeadStatusRequest } from "../types/UpdateLeadStatusRequest.generated";
import { LeadStatusField } from "./LeadStatusField.generated";

export interface LeadStatusFormLookupOption {
  readonly label: string;
  readonly value: string;
}

interface LeadStatusFormBaseProps {
  readonly onSubmit: () => void;
  readonly submitLabel?: string;
  readonly submitting?: boolean;
  readonly disabled?: boolean;
  readonly lookupOptions?: Readonly<Record<string, readonly LeadStatusFormLookupOption[]>>;
  readonly onLookupSuggest?: (field: string, query: string) => void;
}

export type LeadStatusFormProps =
  | (LeadStatusFormBaseProps & {
      readonly mode: "create";
      readonly value: CreateLeadStatusRequest;
      readonly onChange: (value: CreateLeadStatusRequest) => void;
      readonly errors?: Partial<Record<keyof CreateLeadStatusRequest, string>>;
    })
  | (LeadStatusFormBaseProps & {
      readonly mode: "edit";
      readonly value: UpdateLeadStatusRequest;
      readonly onChange: (value: UpdateLeadStatusRequest) => void;
      readonly errors?: Partial<Record<keyof UpdateLeadStatusRequest, string>>;
    });

export function LeadStatusForm(props: LeadStatusFormProps) {
  const disabled = Boolean(props.disabled || props.submitting);
  const fields = props.mode === "create" ? (
    <>
      <LeadStatusField
        id="leadstatus-code"
        label="Code"
        kind="text"
        value={props.value["code"]}
        required={true}
        disabled={disabled}
        error={props.errors?.["code"] ?? null}
        onChange={(nextValue) => {
          props.onChange({
            ...props.value,
            ["code"]: nextValue as CreateLeadStatusRequest["code"],
          });
        }}
      />
      <LeadStatusField
        id="leadstatus-name"
        label="Name"
        kind="text"
        value={props.value["name"]}
        required={true}
        disabled={disabled}
        error={props.errors?.["name"] ?? null}
        onChange={(nextValue) => {
          props.onChange({
            ...props.value,
            ["name"]: nextValue as CreateLeadStatusRequest["name"],
          });
        }}
      />
      <LeadStatusField
        id="leadstatus-sortorder"
        label="Sort Order"
        kind="number"
        value={props.value["sortOrder"]}
        required={true}
        disabled={disabled}
        error={props.errors?.["sortOrder"] ?? null}
        onChange={(nextValue) => {
          props.onChange({
            ...props.value,
            ["sortOrder"]: nextValue as CreateLeadStatusRequest["sortOrder"],
          });
        }}
      />
    </>
  ) : (
    <>
      <LeadStatusField
        id="leadstatus-code"
        label="Code"
        kind="text"
        value={props.value["code"]}
        required={true}
        disabled={disabled}
        error={props.errors?.["code"] ?? null}
        onChange={(nextValue) => {
          props.onChange({
            ...props.value,
            ["code"]: nextValue as UpdateLeadStatusRequest["code"],
          });
        }}
      />
      <LeadStatusField
        id="leadstatus-name"
        label="Name"
        kind="text"
        value={props.value["name"]}
        required={true}
        disabled={disabled}
        error={props.errors?.["name"] ?? null}
        onChange={(nextValue) => {
          props.onChange({
            ...props.value,
            ["name"]: nextValue as UpdateLeadStatusRequest["name"],
          });
        }}
      />
      <LeadStatusField
        id="leadstatus-sortorder"
        label="Sort Order"
        kind="number"
        value={props.value["sortOrder"]}
        required={true}
        disabled={disabled}
        error={props.errors?.["sortOrder"] ?? null}
        onChange={(nextValue) => {
          props.onChange({
            ...props.value,
            ["sortOrder"]: nextValue as UpdateLeadStatusRequest["sortOrder"],
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
