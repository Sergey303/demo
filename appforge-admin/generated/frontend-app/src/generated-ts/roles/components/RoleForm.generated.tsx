// ------------------------------------------------------------------------------
// GENERATED FILE - source: roles/types.json
// DO NOT EDIT MANUALLY.
// ------------------------------------------------------------------------------

import { Button } from "primereact/button";
import type { CreateRoleRequest } from "../types/CreateRoleRequest.generated";
import type { UpdateRoleRequest } from "../types/UpdateRoleRequest.generated";
import { RoleField } from "./RoleField.generated";

export interface RoleFormLookupOption {
  readonly label: string;
  readonly value: string;
}

interface RoleFormBaseProps {
  readonly onSubmit: () => void;
  readonly submitLabel?: string;
  readonly submitting?: boolean;
  readonly disabled?: boolean;
  readonly lookupOptions?: Readonly<Record<string, readonly RoleFormLookupOption[]>>;
  readonly onLookupSuggest?: (field: string, query: string) => void;
}

export type RoleFormProps =
  | (RoleFormBaseProps & {
      readonly mode: "create";
      readonly value: CreateRoleRequest;
      readonly onChange: (value: CreateRoleRequest) => void;
      readonly errors?: Partial<Record<keyof CreateRoleRequest, string>>;
    })
  | (RoleFormBaseProps & {
      readonly mode: "edit";
      readonly value: UpdateRoleRequest;
      readonly onChange: (value: UpdateRoleRequest) => void;
      readonly errors?: Partial<Record<keyof UpdateRoleRequest, string>>;
    });

export function RoleForm(props: RoleFormProps) {
  const disabled = Boolean(props.disabled || props.submitting);
  const fields = props.mode === "create" ? (
    <>
      <RoleField
        id="role-code"
        label="Code"
        kind="text"
        value={props.value["code"]}
        required={true}
        disabled={disabled}
        error={props.errors?.["code"] ?? null}
        onChange={(nextValue) => {
          props.onChange({
            ...props.value,
            ["code"]: nextValue as CreateRoleRequest["code"],
          });
        }}
      />
      <RoleField
        id="role-name"
        label="Name"
        kind="text"
        value={props.value["name"]}
        required={true}
        disabled={disabled}
        error={props.errors?.["name"] ?? null}
        onChange={(nextValue) => {
          props.onChange({
            ...props.value,
            ["name"]: nextValue as CreateRoleRequest["name"],
          });
        }}
      />
    </>
  ) : (
    <>
      <RoleField
        id="role-code"
        label="Code"
        kind="text"
        value={props.value["code"]}
        required={true}
        disabled={disabled}
        error={props.errors?.["code"] ?? null}
        onChange={(nextValue) => {
          props.onChange({
            ...props.value,
            ["code"]: nextValue as UpdateRoleRequest["code"],
          });
        }}
      />
      <RoleField
        id="role-name"
        label="Name"
        kind="text"
        value={props.value["name"]}
        required={true}
        disabled={disabled}
        error={props.errors?.["name"] ?? null}
        onChange={(nextValue) => {
          props.onChange({
            ...props.value,
            ["name"]: nextValue as UpdateRoleRequest["name"],
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
