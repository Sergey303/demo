// ------------------------------------------------------------------------------
// GENERATED FILE - source: servicerequests/endpoints.json
// DO NOT EDIT MANUALLY.
// ------------------------------------------------------------------------------

import { useState } from "react";
import { Button } from "primereact/button";
import { Dialog } from "primereact/dialog";
import { Message } from "primereact/message";
import { TabPanel, TabView } from "primereact/tabview";
import { readFieldErrors } from "../../runtime/validationErrorRuntime";
import type { ServiceRequestDto } from "../types/ServiceRequestDto.generated";
import type { CreateServiceRequestRequest } from "../types/CreateServiceRequestRequest.generated";
import type { UpdateServiceRequestRequest } from "../types/UpdateServiceRequestRequest.generated";
import { ServiceRequestForm } from "../components/ServiceRequestForm.generated";
import { ServiceRequestTable } from "../components/ServiceRequestTable.generated";
import { useServiceRequestControllerListQuery } from "../../operations/useServiceRequestControllerListQuery.react-query.generated";
import { useServiceRequestControllerCreateMutation } from "../../operations/useServiceRequestControllerCreateMutation.react-mutation.generated";
import { useServiceRequestControllerUpdateMutation } from "../../operations/useServiceRequestControllerUpdateMutation.react-mutation.generated";
import { useServiceRequestControllerDeleteMutation } from "../../operations/useServiceRequestControllerDeleteMutation.react-mutation.generated";
import { useServiceRequestControllerSuggestQuery } from "../../operations/useServiceRequestControllerSuggestQuery.react-query.generated";
import type { ListServiceRequestRequest } from "../types/ListServiceRequestRequest.generated";

export function ServicerequestsPage() {
  return (
    <main className="appforge-generated-page">
      <header className="appforge-generated-page-header">
        <h1>Servicerequests</h1>
      </header>
      <TabView>
        <TabPanel header="Service Requests">
          <ServiceRequestSection />
        </TabPanel>
      </TabView>
    </main>
  );
}

type ServiceRequestEditorState =
  | { readonly mode: "create"; readonly value: CreateServiceRequestRequest }
  | { readonly mode: "edit"; readonly item: ServiceRequestDto; readonly value: UpdateServiceRequestRequest }
  | null;

function ServiceRequestSection() {
  const [listRequest, setListRequest] = useState<ListServiceRequestRequest>({
    page: 1,
    pageSize: 10,
    filters: [],
    sort: [],
  });
  const [detail, setDetail] = useState<ServiceRequestDto | null>(null);
  const list = useServiceRequestControllerListQuery({ request: listRequest });
  const [suggestRequest, setSuggestRequest] = useState({ field: "__none", query: "" });
  const suggest = useServiceRequestControllerSuggestQuery({
    field: suggestRequest.field,
    request: { query: suggestRequest.query, take: 10 },
  });
  const suggestionItems = suggestRequest.field !== "__none"
    ? { [suggestRequest.field]: (suggest.data ?? []).map((item) => item.value) }
    : {};
  const createMutation = useServiceRequestControllerCreateMutation();
  const updateMutation = useServiceRequestControllerUpdateMutation();
  const deleteMutation = useServiceRequestControllerDeleteMutation();
  const [editor, setEditor] = useState<ServiceRequestEditorState>(null);
  const items = list.data?.items ?? [];
  const totalCount = list.data?.totalCount ?? 0;
  const saving = createMutation.isPending || updateMutation.isPending;

  const resetEditorErrors = () => {
    createMutation.reset();
    updateMutation.reset();
  };

  const openCreate = () => {
    resetEditorErrors();
    setEditor({ mode: "create", value: { customerId: "", description: null, priority: null, title: "" } });
  };
  const openEdit = (item: ServiceRequestDto) => {
    resetEditorErrors();
    setEditor({ mode: "edit", item, value: { customerId: item["customerId"], description: item["description"], priority: item["priority"], title: item["title"] } });
  };
  const openDetail = (item: ServiceRequestDto) => {
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

  const deleteItem = (item: ServiceRequestDto) => {
    void deleteMutation.execute({ id: item["id"] });
  };

  return (
    <section className="appforge-generated-resource-page-section">
      <div className="appforge-generated-resource-page-toolbar">
        <h2>Service Requests</h2>
        <Button type="button" label="Create ServiceRequest" onClick={openCreate} />
      </div>
      {list.error ? (
        <Message severity="error" text="Failed to load Service Requests." />
      ) : null}
      <ServiceRequestTable
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
            <h3>Service Request details</h3>
            <div className="appforge-generated-detail-actions">
              <Button type="button" label="Edit" text onClick={() => openEdit(detail)} />
              <Button type="button" label="Close" text onClick={() => setDetail(null)} />
            </div>
          </div>
          <dl className="appforge-generated-detail-fields">
            <div className="appforge-generated-detail-field">
              <dt>Customer Id</dt>
              <dd>{formatDetailValue(detail["customerId"])}</dd>
            </div>
            <div className="appforge-generated-detail-field">
              <dt>Description</dt>
              <dd>{formatDetailValue(detail["description"])}</dd>
            </div>
            <div className="appforge-generated-detail-field">
              <dt>Priority</dt>
              <dd>{formatDetailValue(detail["priority"])}</dd>
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
        header={editor?.mode === "edit" ? "Edit ServiceRequest" : "Create ServiceRequest"}
        modal
        onHide={closeEditor}
      >
        {editor ? (
          editor.mode === "create" ? (
            <ServiceRequestForm
              mode="create"
              value={editor.value}
              onChange={(value) => setEditor({ mode: "create", value })}
              onSubmit={saveEditor}
              submitLabel="Create"
              submitting={saving}
              errors={readFieldErrors(createMutation.error)}
            />
          ) : (
            <ServiceRequestForm
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
