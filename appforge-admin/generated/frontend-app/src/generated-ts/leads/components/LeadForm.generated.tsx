// ------------------------------------------------------------------------------
// GENERATED FILE - source: leads/types.json
// DO NOT EDIT MANUALLY.
// ------------------------------------------------------------------------------

import { Button } from "primereact/button";
import type { CreateLeadRequest } from "../types/CreateLeadRequest.generated";
import type { UpdateLeadRequest } from "../types/UpdateLeadRequest.generated";
import { LeadField } from "./LeadField.generated";

export interface LeadFormLookupOption {
  readonly label: string;
  readonly value: string;
}

interface LeadFormBaseProps {
  readonly onSubmit: () => void;
  readonly submitLabel?: string;
  readonly submitting?: boolean;
  readonly disabled?: boolean;
  readonly lookupOptions?: Readonly<Record<string, readonly LeadFormLookupOption[]>>;
  readonly onLookupSuggest?: (field: string, query: string) => void;
}

export type LeadFormProps =
  | (LeadFormBaseProps & {
      readonly mode: "create";
      readonly value: CreateLeadRequest;
      readonly onChange: (value: CreateLeadRequest) => void;
      readonly errors?: Partial<Record<keyof CreateLeadRequest, string>>;
    })
  | (LeadFormBaseProps & {
      readonly mode: "edit";
      readonly value: UpdateLeadRequest;
      readonly onChange: (value: UpdateLeadRequest) => void;
      readonly errors?: Partial<Record<keyof UpdateLeadRequest, string>>;
    });

export function LeadForm(props: LeadFormProps) {
  const disabled = Boolean(props.disabled || props.submitting);
  const fields = props.mode === "create" ? (
    <>
      <LeadField
        id="lead-note"
        label="Note"
        kind="text"
        value={props.value["note"]}
        required={false}
        disabled={disabled}
        error={props.errors?.["note"] ?? null}
        onChange={(nextValue) => {
          props.onChange({
            ...props.value,
            ["note"]: nextValue as CreateLeadRequest["note"],
          });
        }}
      />
      <LeadField
        id="lead-owner"
        label="Owner"
        kind="text"
        value={props.value["owner"]}
        required={false}
        disabled={disabled}
        error={props.errors?.["owner"] ?? null}
        onChange={(nextValue) => {
          props.onChange({
            ...props.value,
            ["owner"]: nextValue as CreateLeadRequest["owner"],
          });
        }}
      />
      <LeadField
        id="lead-statusid"
        label="Status Id"
        kind="text"
        value={props.value["statusId"]}
        required={true}
        disabled={disabled}
        error={props.errors?.["statusId"] ?? null}
        onChange={(nextValue) => {
          props.onChange({
            ...props.value,
            ["statusId"]: nextValue as CreateLeadRequest["statusId"],
          });
        }}
      />
      <LeadField
        id="lead-subject"
        label="Subject"
        kind="text"
        value={props.value["subject"]}
        required={true}
        disabled={disabled}
        error={props.errors?.["subject"] ?? null}
        onChange={(nextValue) => {
          props.onChange({
            ...props.value,
            ["subject"]: nextValue as CreateLeadRequest["subject"],
          });
        }}
      />
      <LeadField
        id="lead-subscriberid"
        label="Subscriber Id"
        kind="text"
        value={props.value["subscriberId"]}
        required={true}
        disabled={disabled}
        error={props.errors?.["subscriberId"] ?? null}
        onChange={(nextValue) => {
          props.onChange({
            ...props.value,
            ["subscriberId"]: nextValue as CreateLeadRequest["subscriberId"],
          });
        }}
      />
    </>
  ) : (
    <>
      <LeadField
        id="lead-note"
        label="Note"
        kind="text"
        value={props.value["note"]}
        required={false}
        disabled={disabled}
        error={props.errors?.["note"] ?? null}
        onChange={(nextValue) => {
          props.onChange({
            ...props.value,
            ["note"]: nextValue as UpdateLeadRequest["note"],
          });
        }}
      />
      <LeadField
        id="lead-owner"
        label="Owner"
        kind="text"
        value={props.value["owner"]}
        required={false}
        disabled={disabled}
        error={props.errors?.["owner"] ?? null}
        onChange={(nextValue) => {
          props.onChange({
            ...props.value,
            ["owner"]: nextValue as UpdateLeadRequest["owner"],
          });
        }}
      />
      <LeadField
        id="lead-statusid"
        label="Status Id"
        kind="text"
        value={props.value["statusId"]}
        required={true}
        disabled={disabled}
        error={props.errors?.["statusId"] ?? null}
        onChange={(nextValue) => {
          props.onChange({
            ...props.value,
            ["statusId"]: nextValue as UpdateLeadRequest["statusId"],
          });
        }}
      />
      <LeadField
        id="lead-subject"
        label="Subject"
        kind="text"
        value={props.value["subject"]}
        required={true}
        disabled={disabled}
        error={props.errors?.["subject"] ?? null}
        onChange={(nextValue) => {
          props.onChange({
            ...props.value,
            ["subject"]: nextValue as UpdateLeadRequest["subject"],
          });
        }}
      />
      <LeadField
        id="lead-subscriberid"
        label="Subscriber Id"
        kind="text"
        value={props.value["subscriberId"]}
        required={true}
        disabled={disabled}
        error={props.errors?.["subscriberId"] ?? null}
        onChange={(nextValue) => {
          props.onChange({
            ...props.value,
            ["subscriberId"]: nextValue as UpdateLeadRequest["subscriberId"],
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
