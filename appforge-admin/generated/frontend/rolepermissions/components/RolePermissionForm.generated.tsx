// ------------------------------------------------------------------------------
// GENERATED FILE - source: rolepermissions/types.json
// DO NOT EDIT MANUALLY.
// ------------------------------------------------------------------------------

import { Button } from "primereact/button";
import type { CreateRolePermissionRequest } from "../types/CreateRolePermissionRequest.generated";
import type { UpdateRolePermissionRequest } from "../types/UpdateRolePermissionRequest.generated";
import { RolePermissionField } from "./RolePermissionField.generated";

export interface RolePermissionFormLookupOption {
  readonly label: string;
  readonly value: string;
}

interface RolePermissionFormBaseProps {
  readonly onSubmit: () => void;
  readonly submitLabel?: string;
  readonly submitting?: boolean;
  readonly disabled?: boolean;
  readonly lookupOptions?: Readonly<Record<string, readonly RolePermissionFormLookupOption[]>>;
  readonly onLookupSuggest?: (field: string, query: string) => void;
}

export type RolePermissionFormProps =
  | (RolePermissionFormBaseProps & {
      readonly mode: "create";
      readonly value: CreateRolePermissionRequest;
      readonly onChange: (value: CreateRolePermissionRequest) => void;
      readonly errors?: Partial<Record<keyof CreateRolePermissionRequest, string>>;
    })
  | (RolePermissionFormBaseProps & {
      readonly mode: "edit";
      readonly value: UpdateRolePermissionRequest;
      readonly onChange: (value: UpdateRolePermissionRequest) => void;
      readonly errors?: Partial<Record<keyof UpdateRolePermissionRequest, string>>;
    });

export function RolePermissionForm(props: RolePermissionFormProps) {
  const disabled = Boolean(props.disabled || props.submitting);
  const fields = props.mode === "create" ? (
    <>
      <RolePermissionField
        id="rolepermission-permissionid"
        label="Permission Id"
        kind="text"
        value={props.value["permissionId"]}
        required={true}
        disabled={disabled}
        error={props.errors?.["permissionId"] ?? null}
        onChange={(nextValue) => {
          props.onChange({
            ...props.value,
            ["permissionId"]: nextValue as CreateRolePermissionRequest["permissionId"],
          });
        }}
      />
      <RolePermissionField
        id="rolepermission-roleid"
        label="Role Id"
        kind="text"
        value={props.value["roleId"]}
        required={true}
        disabled={disabled}
        error={props.errors?.["roleId"] ?? null}
        onChange={(nextValue) => {
          props.onChange({
            ...props.value,
            ["roleId"]: nextValue as CreateRolePermissionRequest["roleId"],
          });
        }}
      />
    </>
  ) : (
    <>
      <RolePermissionField
        id="rolepermission-permissionid"
        label="Permission Id"
        kind="text"
        value={props.value["permissionId"]}
        required={true}
        disabled={disabled}
        error={props.errors?.["permissionId"] ?? null}
        onChange={(nextValue) => {
          props.onChange({
            ...props.value,
            ["permissionId"]: nextValue as UpdateRolePermissionRequest["permissionId"],
          });
        }}
      />
      <RolePermissionField
        id="rolepermission-roleid"
        label="Role Id"
        kind="text"
        value={props.value["roleId"]}
        required={true}
        disabled={disabled}
        error={props.errors?.["roleId"] ?? null}
        onChange={(nextValue) => {
          props.onChange({
            ...props.value,
            ["roleId"]: nextValue as UpdateRolePermissionRequest["roleId"],
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
