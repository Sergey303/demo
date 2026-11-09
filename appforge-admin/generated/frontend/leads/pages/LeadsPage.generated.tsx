// ------------------------------------------------------------------------------
// GENERATED FILE - source: leads/endpoints.json
// DO NOT EDIT MANUALLY.
// ------------------------------------------------------------------------------

import { useState } from "react";
import { Button } from "primereact/button";
import { Dialog } from "primereact/dialog";
import { Message } from "primereact/message";
import { TabPanel, TabView } from "primereact/tabview";
import { readFieldErrors } from "../../runtime/validationErrorRuntime";
import type { LeadDto } from "../types/LeadDto.generated";
import type { CreateLeadRequest } from "../types/CreateLeadRequest.generated";
import type { UpdateLeadRequest } from "../types/UpdateLeadRequest.generated";
import { LeadForm } from "../components/LeadForm.generated";
import { LeadTable } from "../components/LeadTable.generated";
import { useLeadControllerListQuery } from "../../operations/useLeadControllerListQuery.react-query.generated";
import { useLeadControllerCreateMutation } from "../../operations/useLeadControllerCreateMutation.react-mutation.generated";
import { useLeadControllerUpdateMutation } from "../../operations/useLeadControllerUpdateMutation.react-mutation.generated";
import { useLeadControllerDeleteMutation } from "../../operations/useLeadControllerDeleteMutation.react-mutation.generated";
import { useLeadControllerSuggestQuery } from "../../operations/useLeadControllerSuggestQuery.react-query.generated";
import { useLeadControllerOptionsQuery } from "../../operations/useLeadControllerOptionsQuery.react-query.generated";
import type { ListLeadRequest } from "../types/ListLeadRequest.generated";

export function LeadsPage() {
  return (
    <main className="appforge-generated-page">
      <header className="appforge-generated-page-header">
        <h1>Leads</h1>
      </header>
      <TabView>
        <TabPanel header="Leads">
          <LeadSection />
        </TabPanel>
      </TabView>
    </main>
  );
}

type LeadEditorState =
  | { readonly mode: "create"; readonly value: CreateLeadRequest }
  | { readonly mode: "edit"; readonly item: LeadDto; readonly value: UpdateLeadRequest }
  | null;

function LeadSection() {
  const [listRequest, setListRequest] = useState<ListLeadRequest>({
    page: 1,
    pageSize: 10,
    filters: [],
    sort: [],
  });
  const [detail, setDetail] = useState<LeadDto | null>(null);
  const list = useLeadControllerListQuery({ request: listRequest });
  const [suggestRequest, setSuggestRequest] = useState({ field: "__none", query: "" });
  const suggest = useLeadControllerSuggestQuery({
    field: suggestRequest.field,
    request: { query: suggestRequest.query, take: 10 },
  });
  const suggestionItems = suggestRequest.field !== "__none"
    ? { [suggestRequest.field]: (suggest.data ?? []).map((item) => item.value) }
    : {};
  const StatusNameOptions = useLeadControllerOptionsQuery({ field: "statusName" });
  const optionItems = {
    statusName: StatusNameOptions.data ?? [],
  };
  const createMutation = useLeadControllerCreateMutation();
  const updateMutation = useLeadControllerUpdateMutation();
  const deleteMutation = useLeadControllerDeleteMutation();
  const [editor, setEditor] = useState<LeadEditorState>(null);
  const items = list.data?.items ?? [];
  const totalCount = list.data?.totalCount ?? 0;
  const saving = createMutation.isPending || updateMutation.isPending;

  const resetEditorErrors = () => {
    createMutation.reset();
    updateMutation.reset();
  };

  const openCreate = () => {
    resetEditorErrors();
    setEditor({ mode: "create", value: { createdAt: "", note: null, owner: null, statusId: "", subject: "", subscriberId: "" } });
  };
  const openEdit = (item: LeadDto) => {
    resetEditorErrors();
    setEditor({ mode: "edit", item, value: { createdAt: item["createdAt"], note: item["note"], owner: item["owner"], statusId: item["statusId"], subject: item["subject"], subscriberId: item["subscriberId"] } });
  };
  const openDetail = (item: LeadDto) => {
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

  const deleteItem = (item: LeadDto) => {
    void deleteMutation.execute({ id: item["id"] });
  };

  return (
    <section className="appforge-generated-resource-page-section">
      <div className="appforge-generated-resource-page-toolbar">
        <h2>Leads</h2>
        <Button type="button" label="Create Lead" onClick={openCreate} />
      </div>
      {list.error ? (
        <Message severity="error" text="Failed to load Leads." />
      ) : null}
      <LeadTable
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
            <h3>Lead details</h3>
            <div className="appforge-generated-detail-actions">
              <Button type="button" label="Edit" text onClick={() => openEdit(detail)} />
              <Button type="button" label="Close" text onClick={() => setDetail(null)} />
            </div>
          </div>
          <dl className="appforge-generated-detail-fields">
            <div className="appforge-generated-detail-field">
              <dt>Note</dt>
              <dd>{formatDetailValue(detail["note"])}</dd>
            </div>
            <div className="appforge-generated-detail-field">
              <dt>Owner</dt>
              <dd>{formatDetailValue(detail["owner"])}</dd>
            </div>
            <div className="appforge-generated-detail-field">
              <dt>Status</dt>
              <dd>{formatDetailValue(detail["statusName"])}</dd>
            </div>
            <div className="appforge-generated-detail-field">
              <dt>Subject</dt>
              <dd>{formatDetailValue(detail["subject"])}</dd>
            </div>
            <div className="appforge-generated-detail-field">
              <dt>Subscriber Id</dt>
              <dd>{formatDetailValue(detail["subscriberId"])}</dd>
            </div>
          </dl>
        </section>
      ) : null}
      <Dialog
        visible={editor !== null}
        header={editor?.mode === "edit" ? "Edit Lead" : "Create Lead"}
        modal
        onHide={closeEditor}
      >
        {editor ? (
          editor.mode === "create" ? (
            <LeadForm
              mode="create"
              value={editor.value}
              onChange={(value) => setEditor({ mode: "create", value })}
              onSubmit={saveEditor}
              submitLabel="Create"
              submitting={saving}
              errors={readFieldErrors(createMutation.error)}
            />
          ) : (
            <LeadForm
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
