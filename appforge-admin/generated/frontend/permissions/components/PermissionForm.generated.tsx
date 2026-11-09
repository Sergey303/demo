// ------------------------------------------------------------------------------
// GENERATED FILE - source: permissions/types.json
// DO NOT EDIT MANUALLY.
// ------------------------------------------------------------------------------

import { Button } from "primereact/button";
import type { CreatePermissionRequest } from "../types/CreatePermissionRequest.generated";
import type { UpdatePermissionRequest } from "../types/UpdatePermissionRequest.generated";
import { PermissionField } from "./PermissionField.generated";

export interface PermissionFormLookupOption {
  readonly label: string;
  readonly value: string;
}

interface PermissionFormBaseProps {
  readonly onSubmit: () => void;
  readonly submitLabel?: string;
  readonly submitting?: boolean;
  readonly disabled?: boolean;
  readonly lookupOptions?: Readonly<Record<string, readonly PermissionFormLookupOption[]>>;
  readonly onLookupSuggest?: (field: string, query: string) => void;
}

export type PermissionFormProps =
  | (PermissionFormBaseProps & {
      readonly mode: "create";
      readonly value: CreatePermissionRequest;
      readonly onChange: (value: CreatePermissionRequest) => void;
      readonly errors?: Partial<Record<keyof CreatePermissionRequest, string>>;
    })
  | (PermissionFormBaseProps & {
      readonly mode: "edit";
      readonly value: UpdatePermissionRequest;
      readonly onChange: (value: UpdatePermissionRequest) => void;
      readonly errors?: Partial<Record<keyof UpdatePermissionRequest, string>>;
    });

export function PermissionForm(props: PermissionFormProps) {
  const disabled = Boolean(props.disabled || props.submitting);
  const fields = props.mode === "create" ? (
    <>
      <PermissionField
        id="permission-code"
        label="Code"
        kind="text"
        value={props.value["code"]}
        required={true}
        disabled={disabled}
        error={props.errors?.["code"] ?? null}
        onChange={(nextValue) => {
          props.onChange({
            ...props.value,
            ["code"]: nextValue as CreatePermissionRequest["code"],
          });
        }}
      />
      <PermissionField
        id="permission-name"
        label="Name"
        kind="text"
        value={props.value["name"]}
        required={true}
        disabled={disabled}
        error={props.errors?.["name"] ?? null}
        onChange={(nextValue) => {
          props.onChange({
            ...props.value,
            ["name"]: nextValue as CreatePermissionRequest["name"],
          });
        }}
      />
    </>
  ) : (
    <>
      <PermissionField
        id="permission-code"
        label="Code"
        kind="text"
        value={props.value["code"]}
        required={true}
        disabled={disabled}
        error={props.errors?.["code"] ?? null}
        onChange={(nextValue) => {
          props.onChange({
            ...props.value,
            ["code"]: nextValue as UpdatePermissionRequest["code"],
          });
        }}
      />
      <PermissionField
        id="permission-name"
        label="Name"
        kind="text"
        value={props.value["name"]}
        required={true}
        disabled={disabled}
        error={props.errors?.["name"] ?? null}
        onChange={(nextValue) => {
          props.onChange({
            ...props.value,
            ["name"]: nextValue as UpdatePermissionRequest["name"],
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
