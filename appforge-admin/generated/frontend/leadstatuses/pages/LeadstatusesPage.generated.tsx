// ------------------------------------------------------------------------------
// GENERATED FILE - source: leadstatuses/endpoints.json
// DO NOT EDIT MANUALLY.
// ------------------------------------------------------------------------------

import { useState } from "react";
import { Button } from "primereact/button";
import { Dialog } from "primereact/dialog";
import { Message } from "primereact/message";
import { TabPanel, TabView } from "primereact/tabview";
import { readFieldErrors } from "../../runtime/validationErrorRuntime";
import type { LeadStatusDto } from "../types/LeadStatusDto.generated";
import type { CreateLeadStatusRequest } from "../types/CreateLeadStatusRequest.generated";
import type { UpdateLeadStatusRequest } from "../types/UpdateLeadStatusRequest.generated";
import { LeadStatusForm } from "../components/LeadStatusForm.generated";
import { LeadStatusTable } from "../components/LeadStatusTable.generated";
import { useLeadStatusControllerListQuery } from "../../operations/useLeadStatusControllerListQuery.react-query.generated";
import { useLeadStatusControllerCreateMutation } from "../../operations/useLeadStatusControllerCreateMutation.react-mutation.generated";
import { useLeadStatusControllerUpdateMutation } from "../../operations/useLeadStatusControllerUpdateMutation.react-mutation.generated";
import { useLeadStatusControllerDeleteMutation } from "../../operations/useLeadStatusControllerDeleteMutation.react-mutation.generated";
import { useLeadStatusControllerSuggestQuery } from "../../operations/useLeadStatusControllerSuggestQuery.react-query.generated";
import type { ListLeadStatusRequest } from "../types/ListLeadStatusRequest.generated";

export function LeadstatusesPage() {
  return (
    <main className="appforge-generated-page">
      <header className="appforge-generated-page-header">
        <h1>Leadstatuses</h1>
      </header>
      <TabView>
        <TabPanel header="Lead Status">
          <LeadStatusSection />
        </TabPanel>
      </TabView>
    </main>
  );
}

type LeadStatusEditorState =
  | { readonly mode: "create"; readonly value: CreateLeadStatusRequest }
  | { readonly mode: "edit"; readonly item: LeadStatusDto; readonly value: UpdateLeadStatusRequest }
  | null;

function LeadStatusSection() {
  const [listRequest, setListRequest] = useState<ListLeadStatusRequest>({
    page: 1,
    pageSize: 10,
    filters: [],
    sort: [],
  });
  const [detail, setDetail] = useState<LeadStatusDto | null>(null);
  const list = useLeadStatusControllerListQuery({ request: listRequest });
  const [suggestRequest, setSuggestRequest] = useState({ field: "__none", query: "" });
  const suggest = useLeadStatusControllerSuggestQuery({
    field: suggestRequest.field,
    request: { query: suggestRequest.query, take: 10 },
  });
  const suggestionItems = suggestRequest.field !== "__none"
    ? { [suggestRequest.field]: (suggest.data ?? []).map((item) => item.value) }
    : {};
  const createMutation = useLeadStatusControllerCreateMutation();
  const updateMutation = useLeadStatusControllerUpdateMutation();
  const deleteMutation = useLeadStatusControllerDeleteMutation();
  const [editor, setEditor] = useState<LeadStatusEditorState>(null);
  const items = list.data?.items ?? [];
  const totalCount = list.data?.totalCount ?? 0;
  const saving = createMutation.isPending || updateMutation.isPending;

  const resetEditorErrors = () => {
    createMutation.reset();
    updateMutation.reset();
  };

  const openCreate = () => {
    resetEditorErrors();
    setEditor({ mode: "create", value: { code: "", name: "", sortOrder: 0 } });
  };
  const openEdit = (item: LeadStatusDto) => {
    resetEditorErrors();
    setEditor({ mode: "edit", item, value: { code: item["code"], name: item["name"], sortOrder: item["sortOrder"] } });
  };
  const openDetail = (item: LeadStatusDto) => {
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

  const deleteItem = (item: LeadStatusDto) => {
    void deleteMutation.execute({ id: item["id"] });
  };

  return (
    <section className="appforge-generated-resource-page-section">
      <div className="appforge-generated-resource-page-toolbar">
        <h2>Lead Status</h2>
        <Button type="button" label="Create LeadStatus" onClick={openCreate} />
      </div>
      {list.error ? (
        <Message severity="error" text="Failed to load Lead Status." />
      ) : null}
      <LeadStatusTable
        items={items}
        loading={list.isLoading}
        lazy
        page={listRequest.page}
        pageSize={listRequest.pageSize}
        totalRecords={totalCount}
        suggestions={suggestionItems}
        onSuggest={(field, query) => setSuggestRequest({ field, query })}
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
            <h3>Lead Status details</h3>
            <div className="appforge-generated-detail-actions">
              <Button type="button" label="Edit" text onClick={() => openEdit(detail)} />
              <Button type="button" label="Close" text onClick={() => setDetail(null)} />
            </div>
          </div>
          <dl className="appforge-generated-detail-fields">
            <div className="appforge-generated-detail-field">
              <dt>Code</dt>
              <dd>{formatDetailValue(detail["code"])}</dd>
            </div>
            <div className="appforge-generated-detail-field">
              <dt>Name</dt>
              <dd>{formatDetailValue(detail["name"])}</dd>
            </div>
            <div className="appforge-generated-detail-field">
              <dt>Sort Order</dt>
              <dd>{formatDetailValue(detail["sortOrder"])}</dd>
            </div>
          </dl>
        </section>
      ) : null}
      <Dialog
        visible={editor !== null}
        header={editor?.mode === "edit" ? "Edit LeadStatus" : "Create LeadStatus"}
        modal
        onHide={closeEditor}
      >
        {editor ? (
          editor.mode === "create" ? (
            <LeadStatusForm
              mode="create"
              value={editor.value}
              onChange={(value) => setEditor({ mode: "create", value })}
              onSubmit={saveEditor}
              submitLabel="Create"
              submitting={saving}
              errors={readFieldErrors(createMutation.error)}
            />
          ) : (
            <LeadStatusForm
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
