// ------------------------------------------------------------------------------
// GENERATED FILE - source: workitems/endpoints.json
// DO NOT EDIT MANUALLY.
// ------------------------------------------------------------------------------

import { useState } from "react";
import { Button } from "primereact/button";
import { Dialog } from "primereact/dialog";
import { Message } from "primereact/message";
import { TabPanel, TabView } from "primereact/tabview";
import { readFieldErrors } from "../../runtime/validationErrorRuntime";
import type { WorkItemDto } from "../types/WorkItemDto.generated";
import type { CreateWorkItemRequest } from "../types/CreateWorkItemRequest.generated";
import type { UpdateWorkItemRequest } from "../types/UpdateWorkItemRequest.generated";
import { WorkItemForm } from "../components/WorkItemForm.generated";
import { WorkItemTable } from "../components/WorkItemTable.generated";
import { useWorkItemControllerListQuery } from "../../operations/useWorkItemControllerListQuery.react-query.generated";
import { useWorkItemControllerCreateMutation } from "../../operations/useWorkItemControllerCreateMutation.react-mutation.generated";
import { useWorkItemControllerUpdateMutation } from "../../operations/useWorkItemControllerUpdateMutation.react-mutation.generated";
import { useWorkItemControllerDeleteMutation } from "../../operations/useWorkItemControllerDeleteMutation.react-mutation.generated";
import { useWorkItemControllerSuggestQuery } from "../../operations/useWorkItemControllerSuggestQuery.react-query.generated";
import { useWorkItemControllerOptionsQuery } from "../../operations/useWorkItemControllerOptionsQuery.react-query.generated";
import type { ListWorkItemRequest } from "../types/ListWorkItemRequest.generated";

export function WorkitemsPage() {
  return (
    <main className="appforge-generated-page">
      <header className="appforge-generated-page-header">
        <h1>Workitems</h1>
      </header>
      <TabView>
        <TabPanel header="Work Items">
          <WorkItemSection />
        </TabPanel>
      </TabView>
    </main>
  );
}

type WorkItemEditorState =
  | { readonly mode: "create"; readonly value: CreateWorkItemRequest }
  | { readonly mode: "edit"; readonly item: WorkItemDto; readonly value: UpdateWorkItemRequest }
  | null;

function WorkItemSection() {
  const [listRequest, setListRequest] = useState<ListWorkItemRequest>({
    page: 1,
    pageSize: 10,
    filters: [],
    sort: [],
  });
  const [detail, setDetail] = useState<WorkItemDto | null>(null);
  const list = useWorkItemControllerListQuery({ request: listRequest });
  const [suggestRequest, setSuggestRequest] = useState({ field: "__none", query: "" });
  const suggest = useWorkItemControllerSuggestQuery({
    field: suggestRequest.field,
    request: { query: suggestRequest.query, take: 10 },
  });
  const suggestionItems = suggestRequest.field !== "__none"
    ? { [suggestRequest.field]: (suggest.data ?? []).map((item) => item.value) }
    : {};
  const StatusOptions = useWorkItemControllerOptionsQuery({ field: "status" });
  const optionItems = {
    status: StatusOptions.data ?? [],
  };
  const createMutation = useWorkItemControllerCreateMutation();
  const updateMutation = useWorkItemControllerUpdateMutation();
  const deleteMutation = useWorkItemControllerDeleteMutation();
  const [editor, setEditor] = useState<WorkItemEditorState>(null);
  const items = list.data?.items ?? [];
  const totalCount = list.data?.totalCount ?? 0;
  const saving = createMutation.isPending || updateMutation.isPending;

  const resetEditorErrors = () => {
    createMutation.reset();
    updateMutation.reset();
  };

  const openCreate = () => {
    resetEditorErrors();
    setEditor({ mode: "create", value: { assignee: null, note: null, serviceRequestId: "", status: null, title: "" } });
  };
  const openEdit = (item: WorkItemDto) => {
    resetEditorErrors();
    setEditor({ mode: "edit", item, value: { assignee: item["assignee"], note: item["note"], serviceRequestId: item["serviceRequestId"], status: item["status"], title: item["title"] } });
  };
  const openDetail = (item: WorkItemDto) => {
    setDetail(item);
  };

  const closeEditor = () => {
    resetEditorErrors();
    setEditor(null);
  };

  const saveEditor = () => {
    if (editor === null) {
      return;
    }

    if (editor.mode === "create") {
      void createMutation.execute(editor.value)
        .then(() => closeEditor())
        .catch(() => undefined);
      return;
    }

    void updateMutation.execute({
      id: editor.item["id"],
      body: editor.value,
    })
      .then(() => closeEditor())
      .catch(() => undefined);
  };

  const deleteItem = (item: WorkItemDto) => {
    void deleteMutation.execute({ id: item["id"] });
  };

  return (
    <section className="appforge-generated-resource-page-section">
      <div className="appforge-generated-resource-page-toolbar">
        <h2>Work Items</h2>
        <Button type="button" label="Create WorkItem" onClick={openCreate} />
      </div>
      {list.error ? (
        <Message severity="error" text="Failed to load Work Items." />
      ) : null}
      <WorkItemTable
        items={items}
        loading={list.isLoading}
        lazy
        page={listRequest.page}
        pageSize={listRequest.pageSize}
        totalRecords={totalCount}
        suggestions={suggestionItems}
        onSuggest={(field, query) => setSuggestRequest({ field, query })}
        options={optionItems}
        onPageChange={(next) => setListRequest((current) => ({
          ...current,
          page: next.page,
          pageSize: next.pageSize,
        }))}
        onSortChange={(sort) => setListRequest((current) => ({
          ...current,
          page: 1,
          sort: sort.map((item) => ({ field: item.field, direction: item.direction })),
        }))}
        onFilterChange={(filters) => setListRequest((current) => ({
          ...current,
          page: 1,
          filters: filters.map((item) => ({
            field: item.field,
            operator: item.operator,
            value: item.value,
            values: [...item.values],
          })),
        }))}
        onOpen={openDetail}
        onEdit={openEdit}
        onDelete={deleteItem}
      />
      {detail ? (
        <section className="appforge-generated-detail-panel">
          <div className="appforge-generated-detail-header">
            <h3>Work Item details</h3>
            <div className="appforge-generated-detail-actions">
              <Button type="button" label="Edit" text onClick={() => openEdit(detail)} />
              <Button type="button" label="Close" text onClick={() => setDetail(null)} />
            </div>
          </div>
          <dl className="appforge-generated-detail-fields">
            <div className="appforge-generated-detail-field">
              <dt>Assignee</dt>
              <dd>{formatDetailValue(detail["assignee"])}</dd>
            </div>
            <div className="appforge-generated-detail-field">
              <dt>Note</dt>
              <dd>{formatDetailValue(detail["note"])}</dd>
            </div>
            <div className="appforge-generated-detail-field">
              <dt>Service Request Id</dt>
              <dd>{formatDetailValue(detail["serviceRequestId"])}</dd>
            </div>
            <div className="appforge-generated-detail-field">
              <dt>Status</dt>
              <dd>{formatDetailValue(detail["status"])}</dd>
            </div>
            <div className="appforge-generated-detail-field">
              <dt>Title</dt>
              <dd>{formatDetailValue(detail["title"])}</dd>
            </div>
          </dl>
        </section>
      ) : null}
      <Dialog
        visible={editor !== null}
        header={editor?.mode === "edit" ? "Edit WorkItem" : "Create WorkItem"}
        modal
        onHide={closeEditor}
      >
        {editor ? (
          editor.mode === "create" ? (
            <WorkItemForm
              mode="create"
              value={editor.value}
              onChange={(value) => setEditor({ mode: "create", value })}
              onSubmit={saveEditor}
              submitLabel="Create"
              submitting={saving}
              errors={readFieldErrors(createMutation.error)}
            />
          ) : (
            <WorkItemForm
              mode="edit"
              value={editor.value}
              onChange={(value) => setEditor({ ...editor, value })}
              onSubmit={saveEditor}
              submitLabel="Save"
              submitting={saving}
              errors={readFieldErrors(updateMutation.error)}
            />
          )
        ) : null}
      </Dialog>
    </section>
  );
}


function formatDetailValue(value: unknown): string {
  if (value === null || value === undefined || value === "") {
    return "—";
  }

  if (typeof value === "boolean") {
    return value ? "Yes" : "No";
  }

  return String(value);
}
