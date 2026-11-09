// ------------------------------------------------------------------------------
// GENERATED FILE - source: workitems/types.json
// DO NOT EDIT MANUALLY.
// ------------------------------------------------------------------------------

import { Button } from "primereact/button";
import type { CreateWorkItemRequest } from "../types/CreateWorkItemRequest.generated";
import type { UpdateWorkItemRequest } from "../types/UpdateWorkItemRequest.generated";
import { WorkItemField } from "./WorkItemField.generated";

export interface WorkItemFormLookupOption {
  readonly label: string;
  readonly value: string;
}

interface WorkItemFormBaseProps {
  readonly onSubmit: () => void;
  readonly submitLabel?: string;
  readonly submitting?: boolean;
  readonly disabled?: boolean;
  readonly lookupOptions?: Readonly<Record<string, readonly WorkItemFormLookupOption[]>>;
  readonly onLookupSuggest?: (field: string, query: string) => void;
}

export type WorkItemFormProps =
  | (WorkItemFormBaseProps & {
      readonly mode: "create";
      readonly value: CreateWorkItemRequest;
      readonly onChange: (value: CreateWorkItemRequest) => void;
      readonly errors?: Partial<Record<keyof CreateWorkItemRequest, string>>;
    })
  | (WorkItemFormBaseProps & {
      readonly mode: "edit";
      readonly value: UpdateWorkItemRequest;
      readonly onChange: (value: UpdateWorkItemRequest) => void;
      readonly errors?: Partial<Record<keyof UpdateWorkItemRequest, string>>;
    });

export function WorkItemForm(props: WorkItemFormProps) {
  const disabled = Boolean(props.disabled || props.submitting);
  const fields = props.mode === "create" ? (
    <>
      <WorkItemField
        id="workitem-assignee"
        label="Assignee"
        kind="text"
        value={props.value["assignee"]}
        required={false}
        disabled={disabled}
        error={props.errors?.["assignee"] ?? null}
        onChange={(nextValue) => {
          props.onChange({
            ...props.value,
            ["assignee"]: nextValue as CreateWorkItemRequest["assignee"],
          });
        }}
      />
      <WorkItemField
        id="workitem-note"
        label="Note"
        kind="text"
        value={props.value["note"]}
        required={false}
        disabled={disabled}
        error={props.errors?.["note"] ?? null}
        onChange={(nextValue) => {
          props.onChange({
            ...props.value,
            ["note"]: nextValue as CreateWorkItemRequest["note"],
          });
        }}
      />
      <WorkItemField
        id="workitem-servicerequestid"
        label="Service Request Id"
        kind="text"
        value={props.value["serviceRequestId"]}
        required={true}
        disabled={disabled}
        error={props.errors?.["serviceRequestId"] ?? null}
        onChange={(nextValue) => {
          props.onChange({
            ...props.value,
            ["serviceRequestId"]: nextValue as CreateWorkItemRequest["serviceRequestId"],
          });
        }}
      />
      <WorkItemField
        id="workitem-status"
        label="Status"
        kind="text"
        value={props.value["status"]}
        required={false}
        disabled={disabled}
        error={props.errors?.["status"] ?? null}
        onChange={(nextValue) => {
          props.onChange({
            ...props.value,
            ["status"]: nextValue as CreateWorkItemRequest["status"],
          });
        }}
      />
      <WorkItemField
        id="workitem-title"
        label="Title"
        kind="text"
        value={props.value["title"]}
        required={true}
        disabled={disabled}
        error={props.errors?.["title"] ?? null}
        onChange={(nextValue) => {
          props.onChange({
            ...props.value,
            ["title"]: nextValue as CreateWorkItemRequest["title"],
          });
        }}
      />
    </>
  ) : (
    <>
      <WorkItemField
        id="workitem-assignee"
        label="Assignee"
        kind="text"
        value={props.value["assignee"]}
        required={false}
        disabled={disabled}
        error={props.errors?.["assignee"] ?? null}
        onChange={(nextValue) => {
          props.onChange({
            ...props.value,
            ["assignee"]: nextValue as UpdateWorkItemRequest["assignee"],
          });
        }}
      />
      <WorkItemField
        id="workitem-note"
        label="Note"
        kind="text"
        value={props.value["note"]}
        required={false}
        disabled={disabled}
        error={props.errors?.["note"] ?? null}
        onChange={(nextValue) => {
          props.onChange({
            ...props.value,
            ["note"]: nextValue as UpdateWorkItemRequest["note"],
          });
        }}
      />
      <WorkItemField
        id="workitem-servicerequestid"
        label="Service Request Id"
        kind="text"
        value={props.value["serviceRequestId"]}
        required={true}
        disabled={disabled}
        error={props.errors?.["serviceRequestId"] ?? null}
        onChange={(nextValue) => {
          props.onChange({
            ...props.value,
            ["serviceRequestId"]: nextValue as UpdateWorkItemRequest["serviceRequestId"],
          });
        }}
      />
      <WorkItemField
        id="workitem-status"
        label="Status"
        kind="text"
        value={props.value["status"]}
        required={false}
        disabled={disabled}
        error={props.errors?.["status"] ?? null}
        onChange={(nextValue) => {
          props.onChange({
            ...props.value,
            ["status"]: nextValue as UpdateWorkItemRequest["status"],
          });
        }}
      />
      <WorkItemField
        id="workitem-title"
        label="Title"
        kind="text"
        value={props.value["title"]}
        required={true}
        disabled={disabled}
        error={props.errors?.["title"] ?? null}
        onChange={(nextValue) => {
          props.onChange({
            ...props.value,
            ["title"]: nextValue as UpdateWorkItemRequest["title"],
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
