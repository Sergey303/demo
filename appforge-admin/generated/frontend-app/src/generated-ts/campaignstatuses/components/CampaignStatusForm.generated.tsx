// ------------------------------------------------------------------------------
// GENERATED FILE - source: campaignstatuses/types.json
// DO NOT EDIT MANUALLY.
// ------------------------------------------------------------------------------

import { Button } from "primereact/button";
import type { CreateCampaignStatusRequest } from "../types/CreateCampaignStatusRequest.generated";
import type { UpdateCampaignStatusRequest } from "../types/UpdateCampaignStatusRequest.generated";
import { CampaignStatusField } from "./CampaignStatusField.generated";

export interface CampaignStatusFormLookupOption {
  readonly label: string;
  readonly value: string;
}

interface CampaignStatusFormBaseProps {
  readonly onSubmit: () => void;
  readonly submitLabel?: string;
  readonly submitting?: boolean;
  readonly disabled?: boolean;
  readonly lookupOptions?: Readonly<Record<string, readonly CampaignStatusFormLookupOption[]>>;
  readonly onLookupSuggest?: (field: string, query: string) => void;
}

export type CampaignStatusFormProps =
  | (CampaignStatusFormBaseProps & {
      readonly mode: "create";
      readonly value: CreateCampaignStatusRequest;
      readonly onChange: (value: CreateCampaignStatusRequest) => void;
      readonly errors?: Partial<Record<keyof CreateCampaignStatusRequest, string>>;
    })
  | (CampaignStatusFormBaseProps & {
      readonly mode: "edit";
      readonly value: UpdateCampaignStatusRequest;
      readonly onChange: (value: UpdateCampaignStatusRequest) => void;
      readonly errors?: Partial<Record<keyof UpdateCampaignStatusRequest, string>>;
    });

export function CampaignStatusForm(props: CampaignStatusFormProps) {
  const disabled = Boolean(props.disabled || props.submitting);
  const fields = props.mode === "create" ? (
    <>
      <CampaignStatusField
        id="campaignstatus-code"
        label="Code"
        kind="text"
        value={props.value["code"]}
        required={true}
        disabled={disabled}
        error={props.errors?.["code"] ?? null}
        onChange={(nextValue) => {
          props.onChange({
            ...props.value,
            ["code"]: nextValue as CreateCampaignStatusRequest["code"],
          });
        }}
      />
      <CampaignStatusField
        id="campaignstatus-name"
        label="Name"
        kind="text"
        value={props.value["name"]}
        required={true}
        disabled={disabled}
        error={props.errors?.["name"] ?? null}
        onChange={(nextValue) => {
          props.onChange({
            ...props.value,
            ["name"]: nextValue as CreateCampaignStatusRequest["name"],
          });
        }}
      />
      <CampaignStatusField
        id="campaignstatus-sortorder"
        label="Sort Order"
        kind="number"
        value={props.value["sortOrder"]}
        required={true}
        disabled={disabled}
        error={props.errors?.["sortOrder"] ?? null}
        onChange={(nextValue) => {
          props.onChange({
            ...props.value,
            ["sortOrder"]: nextValue as CreateCampaignStatusRequest["sortOrder"],
          });
        }}
      />
    </>
  ) : (
    <>
      <CampaignStatusField
        id="campaignstatus-code"
        label="Code"
        kind="text"
        value={props.value["code"]}
        required={true}
        disabled={disabled}
        error={props.errors?.["code"] ?? null}
        onChange={(nextValue) => {
          props.onChange({
            ...props.value,
            ["code"]: nextValue as UpdateCampaignStatusRequest["code"],
          });
        }}
      />
      <CampaignStatusField
        id="campaignstatus-name"
        label="Name"
        kind="text"
        value={props.value["name"]}
        required={true}
        disabled={disabled}
        error={props.errors?.["name"] ?? null}
        onChange={(nextValue) => {
          props.onChange({
            ...props.value,
            ["name"]: nextValue as UpdateCampaignStatusRequest["name"],
          });
        }}
      />
      <CampaignStatusField
        id="campaignstatus-sortorder"
        label="Sort Order"
        kind="number"
        value={props.value["sortOrder"]}
        required={true}
        disabled={disabled}
        error={props.errors?.["sortOrder"] ?? null}
        onChange={(nextValue) => {
          props.onChange({
            ...props.value,
            ["sortOrder"]: nextValue as UpdateCampaignStatusRequest["sortOrder"],
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
