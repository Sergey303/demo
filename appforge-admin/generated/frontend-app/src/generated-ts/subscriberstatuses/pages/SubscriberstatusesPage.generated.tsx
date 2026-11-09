// ------------------------------------------------------------------------------
// GENERATED FILE - source: subscriberstatuses/endpoints.json
// DO NOT EDIT MANUALLY.
// ------------------------------------------------------------------------------

import { useState } from "react";
import { Button } from "primereact/button";
import { Dialog } from "primereact/dialog";
import { Message } from "primereact/message";
import { TabPanel, TabView } from "primereact/tabview";
import { readFieldErrors } from "../../runtime/validationErrorRuntime";
import type { SubscriberStatusDto } from "../types/SubscriberStatusDto.generated";
import type { CreateSubscriberStatusRequest } from "../types/CreateSubscriberStatusRequest.generated";
import type { UpdateSubscriberStatusRequest } from "../types/UpdateSubscriberStatusRequest.generated";
import { SubscriberStatusForm } from "../components/SubscriberStatusForm.generated";
import { SubscriberStatusTable } from "../components/SubscriberStatusTable.generated";
import { useSubscriberStatusControllerListQuery } from "../../operations/useSubscriberStatusControllerListQuery.react-query.generated";
import { useSubscriberStatusControllerCreateMutation } from "../../operations/useSubscriberStatusControllerCreateMutation.react-mutation.generated";
import { useSubscriberStatusControllerUpdateMutation } from "../../operations/useSubscriberStatusControllerUpdateMutation.react-mutation.generated";
import { useSubscriberStatusControllerDeleteMutation } from "../../operations/useSubscriberStatusControllerDeleteMutation.react-mutation.generated";
import { useSubscriberStatusControllerSuggestQuery } from "../../operations/useSubscriberStatusControllerSuggestQuery.react-query.generated";
import type { ListSubscriberStatusRequest } from "../types/ListSubscriberStatusRequest.generated";

export function SubscriberstatusesPage() {
  return (
    <main className="appforge-generated-page">
      <header className="appforge-generated-page-header">
        <h1>Subscriberstatuses</h1>
      </header>
      <TabView>
        <TabPanel header="Subscriber Status">
          <SubscriberStatusSection />
        </TabPanel>
      </TabView>
    </main>
  );
}

type SubscriberStatusEditorState =
  | { readonly mode: "create"; readonly value: CreateSubscriberStatusRequest }
  | { readonly mode: "edit"; readonly item: SubscriberStatusDto; readonly value: UpdateSubscriberStatusRequest }
  | null;

function SubscriberStatusSection() {
  const [listRequest, setListRequest] = useState<ListSubscriberStatusRequest>({
    page: 1,
    pageSize: 10,
    filters: [],
    sort: [],
  });
  const [detail, setDetail] = useState<SubscriberStatusDto | null>(null);
  const list = useSubscriberStatusControllerListQuery({ request: listRequest });
  const [suggestRequest, setSuggestRequest] = useState({ field: "__none", query: "" });
  const suggest = useSubscriberStatusControllerSuggestQuery({
    field: suggestRequest.field,
    request: { query: suggestRequest.query, take: 10 },
  });
  const suggestionItems = suggestRequest.field !== "__none"
    ? { [suggestRequest.field]: (suggest.data ?? []).map((item) => item.value) }
    : {};
  const createMutation = useSubscriberStatusControllerCreateMutation();
  const updateMutation = useSubscriberStatusControllerUpdateMutation();
  const deleteMutation = useSubscriberStatusControllerDeleteMutation();
  const [editor, setEditor] = useState<SubscriberStatusEditorState>(null);
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
  const openEdit = (item: SubscriberStatusDto) => {
    resetEditorErrors();
    setEditor({ mode: "edit", item, value: { code: item["code"], name: item["name"], sortOrder: item["sortOrder"] } });
  };
  const openDetail = (item: SubscriberStatusDto) => {
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

  const deleteItem = (item: SubscriberStatusDto) => {
    void deleteMutation.execute({ id: item["id"] });
  };

  return (
    <section className="appforge-generated-resource-page-section">
      <div className="appforge-generated-resource-page-toolbar">
        <h2>Subscriber Status</h2>
        <Button type="button" label="Create SubscriberStatus" onClick={openCreate} />
      </div>
      {list.error ? (
        <Message severity="error" text="Failed to load Subscriber Status." />
      ) : null}
      <SubscriberStatusTable
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
            <h3>Subscriber Status details</h3>
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
        header={editor?.mode === "edit" ? "Edit SubscriberStatus" : "Create SubscriberStatus"}
        modal
        onHide={closeEditor}
      >
        {editor ? (
          editor.mode === "create" ? (
            <SubscriberStatusForm
              mode="create"
              value={editor.value}
              onChange={(value) => setEditor({ mode: "create", value })}
              onSubmit={saveEditor}
              submitLabel="Create"
              submitting={saving}
              errors={readFieldErrors(createMutation.error)}
            />
          ) : (
            <SubscriberStatusForm
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
