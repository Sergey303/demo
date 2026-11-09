// ------------------------------------------------------------------------------
// GENERATED FILE - source: subscribers/endpoints.json
// DO NOT EDIT MANUALLY.
// ------------------------------------------------------------------------------

import { useState } from "react";
import { Button } from "primereact/button";
import { Dialog } from "primereact/dialog";
import { Message } from "primereact/message";
import { TabPanel, TabView } from "primereact/tabview";
import { readFieldErrors } from "../../runtime/validationErrorRuntime";
import type { SubscriberDto } from "../types/SubscriberDto.generated";
import type { CreateSubscriberRequest } from "../types/CreateSubscriberRequest.generated";
import type { UpdateSubscriberRequest } from "../types/UpdateSubscriberRequest.generated";
import { SubscriberForm } from "../components/SubscriberForm.generated";
import { SubscriberTable } from "../components/SubscriberTable.generated";
import { useSubscriberControllerListQuery } from "../../operations/useSubscriberControllerListQuery.react-query.generated";
import { useSubscriberControllerCreateMutation } from "../../operations/useSubscriberControllerCreateMutation.react-mutation.generated";
import { useSubscriberControllerUpdateMutation } from "../../operations/useSubscriberControllerUpdateMutation.react-mutation.generated";
import { useSubscriberControllerDeleteMutation } from "../../operations/useSubscriberControllerDeleteMutation.react-mutation.generated";
import { useSubscriberControllerSuggestQuery } from "../../operations/useSubscriberControllerSuggestQuery.react-query.generated";
import { useSubscriberControllerOptionsQuery } from "../../operations/useSubscriberControllerOptionsQuery.react-query.generated";
import type { ListSubscriberRequest } from "../types/ListSubscriberRequest.generated";

export function SubscribersPage() {
  return (
    <main className="appforge-generated-page">
      <header className="appforge-generated-page-header">
        <h1>Subscribers</h1>
      </header>
      <TabView>
        <TabPanel header="Subscribers">
          <SubscriberSection />
        </TabPanel>
      </TabView>
    </main>
  );
}

type SubscriberEditorState =
  | { readonly mode: "create"; readonly value: CreateSubscriberRequest }
  | { readonly mode: "edit"; readonly item: SubscriberDto; readonly value: UpdateSubscriberRequest }
  | null;

function SubscriberSection() {
  const [listRequest, setListRequest] = useState<ListSubscriberRequest>({
    page: 1,
    pageSize: 10,
    filters: [],
    sort: [],
  });
  const [detail, setDetail] = useState<SubscriberDto | null>(null);
  const list = useSubscriberControllerListQuery({ request: listRequest });
  const [suggestRequest, setSuggestRequest] = useState({ field: "__none", query: "" });
  const suggest = useSubscriberControllerSuggestQuery({
    field: suggestRequest.field,
    request: { query: suggestRequest.query, take: 10 },
  });
  const suggestionItems = suggestRequest.field !== "__none"
    ? { [suggestRequest.field]: (suggest.data ?? []).map((item) => item.value) }
    : {};
  const StatusNameOptions = useSubscriberControllerOptionsQuery({ field: "statusName" });
  const optionItems = {
    statusName: StatusNameOptions.data ?? [],
  };
  const createMutation = useSubscriberControllerCreateMutation();
  const updateMutation = useSubscriberControllerUpdateMutation();
  const deleteMutation = useSubscriberControllerDeleteMutation();
  const [editor, setEditor] = useState<SubscriberEditorState>(null);
  const items = list.data?.items ?? [];
  const totalCount = list.data?.totalCount ?? 0;
  const saving = createMutation.isPending || updateMutation.isPending;

  const resetEditorErrors = () => {
    createMutation.reset();
    updateMutation.reset();
  };

  const openCreate = () => {
    resetEditorErrors();
    setEditor({ mode: "create", value: { displayName: "", handle: "", joinedAt: "", note: null, statusId: "" } });
  };
  const openEdit = (item: SubscriberDto) => {
    resetEditorErrors();
    setEditor({ mode: "edit", item, value: { displayName: item["displayName"], handle: item["handle"], joinedAt: item["joinedAt"], note: item["note"], statusId: item["statusId"] } });
  };
  const openDetail = (item: SubscriberDto) => {
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

  const deleteItem = (item: SubscriberDto) => {
    void deleteMutation.execute({ id: item["id"] });
  };

  return (
    <section className="appforge-generated-resource-page-section">
      <div className="appforge-generated-resource-page-toolbar">
        <h2>Subscribers</h2>
        <Button type="button" label="Create Subscriber" onClick={openCreate} />
      </div>
      {list.error ? (
        <Message severity="error" text="Failed to load Subscribers." />
      ) : null}
      <SubscriberTable
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
            <h3>Subscriber details</h3>
            <div className="appforge-generated-detail-actions">
              <Button type="button" label="Edit" text onClick={() => openEdit(detail)} />
              <Button type="button" label="Close" text onClick={() => setDetail(null)} />
            </div>
          </div>
          <dl className="appforge-generated-detail-fields">
            <div className="appforge-generated-detail-field">
              <dt>Display Name</dt>
              <dd>{formatDetailValue(detail["displayName"])}</dd>
            </div>
            <div className="appforge-generated-detail-field">
              <dt>Handle</dt>
              <dd>{formatDetailValue(detail["handle"])}</dd>
            </div>
            <div className="appforge-generated-detail-field">
              <dt>Joined At</dt>
              <dd>{formatDetailValue(detail["joinedAt"])}</dd>
            </div>
            <div className="appforge-generated-detail-field">
              <dt>Note</dt>
              <dd>{formatDetailValue(detail["note"])}</dd>
            </div>
            <div className="appforge-generated-detail-field">
              <dt>Status</dt>
              <dd>{formatDetailValue(detail["statusName"])}</dd>
            </div>
          </dl>
        </section>
      ) : null}
      <Dialog
        visible={editor !== null}
        header={editor?.mode === "edit" ? "Edit Subscriber" : "Create Subscriber"}
        modal
        onHide={closeEditor}
      >
        {editor ? (
          editor.mode === "create" ? (
            <SubscriberForm
              mode="create"
              value={editor.value}
              onChange={(value) => setEditor({ mode: "create", value })}
              onSubmit={saveEditor}
              submitLabel="Create"
              submitting={saving}
              errors={readFieldErrors(createMutation.error)}
            />
          ) : (
            <SubscriberForm
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
