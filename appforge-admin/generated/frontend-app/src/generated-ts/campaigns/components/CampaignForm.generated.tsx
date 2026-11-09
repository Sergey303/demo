// ------------------------------------------------------------------------------
// GENERATED FILE - source: campaigns/types.json
// DO NOT EDIT MANUALLY.
// ------------------------------------------------------------------------------

import { Button } from "primereact/button";
import type { CreateCampaignRequest } from "../types/CreateCampaignRequest.generated";
import type { UpdateCampaignRequest } from "../types/UpdateCampaignRequest.generated";
import { CampaignField } from "./CampaignField.generated";

export interface CampaignFormLookupOption {
  readonly label: string;
  readonly value: string;
}

interface CampaignFormBaseProps {
  readonly onSubmit: () => void;
  readonly submitLabel?: string;
  readonly submitting?: boolean;
  readonly disabled?: boolean;
  readonly lookupOptions?: Readonly<Record<string, readonly CampaignFormLookupOption[]>>;
  readonly onLookupSuggest?: (field: string, query: string) => void;
}

export type CampaignFormProps =
  | (CampaignFormBaseProps & {
      readonly mode: "create";
      readonly value: CreateCampaignRequest;
      readonly onChange: (value: CreateCampaignRequest) => void;
      readonly errors?: Partial<Record<keyof CreateCampaignRequest, string>>;
    })
  | (CampaignFormBaseProps & {
      readonly mode: "edit";
      readonly value: UpdateCampaignRequest;
      readonly onChange: (value: UpdateCampaignRequest) => void;
      readonly errors?: Partial<Record<keyof UpdateCampaignRequest, string>>;
    });

export function CampaignForm(props: CampaignFormProps) {
  const disabled = Boolean(props.disabled || props.submitting);
  const fields = props.mode === "create" ? (
    <>
      <CampaignField
        id="campaign-audiencedescription"
        label="Audience Description"
        kind="text"
        value={props.value["audienceDescription"]}
        required={true}
        disabled={disabled}
        error={props.errors?.["audienceDescription"] ?? null}
        onChange={(nextValue) => {
          props.onChange({
            ...props.value,
            ["audienceDescription"]: nextValue as CreateCampaignRequest["audienceDescription"],
          });
        }}
      />
      <CampaignField
        id="campaign-messagetemplate"
        label="Message Template"
        kind="text"
        value={props.value["messageTemplate"]}
        required={true}
        disabled={disabled}
        error={props.errors?.["messageTemplate"] ?? null}
        onChange={(nextValue) => {
          props.onChange({
            ...props.value,
            ["messageTemplate"]: nextValue as CreateCampaignRequest["messageTemplate"],
          });
        }}
      />
      <CampaignField
        id="campaign-name"
        label="Name"
        kind="text"
        value={props.value["name"]}
        required={true}
        disabled={disabled}
        error={props.errors?.["name"] ?? null}
        onChange={(nextValue) => {
          props.onChange({
            ...props.value,
            ["name"]: nextValue as CreateCampaignRequest["name"],
          });
        }}
      />
      <CampaignField
        id="campaign-note"
        label="Note"
        kind="text"
        value={props.value["note"]}
        required={false}
        disabled={disabled}
        error={props.errors?.["note"] ?? null}
        onChange={(nextValue) => {
          props.onChange({
            ...props.value,
            ["note"]: nextValue as CreateCampaignRequest["note"],
          });
        }}
      />
      <CampaignField
        id="campaign-statusid"
        label="Status Id"
        kind="text"
        value={props.value["statusId"]}
        required={true}
        disabled={disabled}
        error={props.errors?.["statusId"] ?? null}
        onChange={(nextValue) => {
          props.onChange({
            ...props.value,
            ["statusId"]: nextValue as CreateCampaignRequest["statusId"],
          });
        }}
      />
    </>
  ) : (
    <>
      <CampaignField
        id="campaign-audiencedescription"
        label="Audience Description"
        kind="text"
        value={props.value["audienceDescription"]}
        required={true}
        disabled={disabled}
        error={props.errors?.["audienceDescription"] ?? null}
        onChange={(nextValue) => {
          props.onChange({
            ...props.value,
            ["audienceDescription"]: nextValue as UpdateCampaignRequest["audienceDescription"],
          });
        }}
      />
      <CampaignField
        id="campaign-messagetemplate"
        label="Message Template"
        kind="text"
        value={props.value["messageTemplate"]}
        required={true}
        disabled={disabled}
        error={props.errors?.["messageTemplate"] ?? null}
        onChange={(nextValue) => {
          props.onChange({
            ...props.value,
            ["messageTemplate"]: nextValue as UpdateCampaignRequest["messageTemplate"],
          });
        }}
      />
      <CampaignField
        id="campaign-name"
        label="Name"
        kind="text"
        value={props.value["name"]}
        required={true}
        disabled={disabled}
        error={props.errors?.["name"] ?? null}
        onChange={(nextValue) => {
          props.onChange({
            ...props.value,
            ["name"]: nextValue as UpdateCampaignRequest["name"],
          });
        }}
      />
      <CampaignField
        id="campaign-note"
        label="Note"
        kind="text"
        value={props.value["note"]}
        required={false}
        disabled={disabled}
        error={props.errors?.["note"] ?? null}
        onChange={(nextValue) => {
          props.onChange({
            ...props.value,
            ["note"]: nextValue as UpdateCampaignRequest["note"],
          });
        }}
      />
      <CampaignField
        id="campaign-statusid"
        label="Status Id"
        kind="text"
        value={props.value["statusId"]}
        required={true}
        disabled={disabled}
        error={props.errors?.["statusId"] ?? null}
        onChange={(nextValue) => {
          props.onChange({
            ...props.value,
            ["statusId"]: nextValue as UpdateCampaignRequest["statusId"],
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
