// ------------------------------------------------------------------------------
// GENERATED FILE - source: customers/endpoints.json
// DO NOT EDIT MANUALLY.
// ------------------------------------------------------------------------------

import { useState } from "react";
import { Button } from "primereact/button";
import { Dialog } from "primereact/dialog";
import { Message } from "primereact/message";
import { TabPanel, TabView } from "primereact/tabview";
import { readFieldErrors } from "../../runtime/validationErrorRuntime";
import type { CustomerDto } from "../types/CustomerDto.generated";
import type { CreateCustomerRequest } from "../types/CreateCustomerRequest.generated";
import type { UpdateCustomerRequest } from "../types/UpdateCustomerRequest.generated";
import { CustomerForm } from "../components/CustomerForm.generated";
import { CustomerTable } from "../components/CustomerTable.generated";
import { useCustomerControllerListQuery } from "../../operations/useCustomerControllerListQuery.react-query.generated";
import { useCustomerControllerCreateMutation } from "../../operations/useCustomerControllerCreateMutation.react-mutation.generated";
import { useCustomerControllerUpdateMutation } from "../../operations/useCustomerControllerUpdateMutation.react-mutation.generated";
import { useCustomerControllerDeleteMutation } from "../../operations/useCustomerControllerDeleteMutation.react-mutation.generated";
import { useCustomerControllerSuggestQuery } from "../../operations/useCustomerControllerSuggestQuery.react-query.generated";
import type { ListCustomerRequest } from "../types/ListCustomerRequest.generated";

export function CustomersPage() {
  return (
    <main className="appforge-generated-page">
      <header className="appforge-generated-page-header">
        <h1>Customers</h1>
      </header>
      <TabView>
        <TabPanel header="Customers">
          <CustomerSection />
        </TabPanel>
      </TabView>
    </main>
  );
}

type CustomerEditorState =
  | { readonly mode: "create"; readonly value: CreateCustomerRequest }
  | { readonly mode: "edit"; readonly item: CustomerDto; readonly value: UpdateCustomerRequest }
  | null;

function CustomerSection() {
  const [listRequest, setListRequest] = useState<ListCustomerRequest>({
    page: 1,
    pageSize: 10,
    filters: [],
    sort: [],
  });
  const [detail, setDetail] = useState<CustomerDto | null>(null);
  const list = useCustomerControllerListQuery({ request: listRequest });
  const [suggestRequest, setSuggestRequest] = useState({ field: "__none", query: "" });
  const suggest = useCustomerControllerSuggestQuery({
    field: suggestRequest.field,
    request: { query: suggestRequest.query, take: 10 },
  });
  const suggestionItems = suggestRequest.field !== "__none"
    ? { [suggestRequest.field]: (suggest.data ?? []).map((item) => item.value) }
    : {};
  const createMutation = useCustomerControllerCreateMutation();
  const updateMutation = useCustomerControllerUpdateMutation();
  const deleteMutation = useCustomerControllerDeleteMutation();
  const [editor, setEditor] = useState<CustomerEditorState>(null);
  const items = list.data?.items ?? [];
  const totalCount = list.data?.totalCount ?? 0;
  const saving = createMutation.isPending || updateMutation.isPending;

  const resetEditorErrors = () => {
    createMutation.reset();
    updateMutation.reset();
  };

  const openCreate = () => {
    resetEditorErrors();
    setEditor({ mode: "create", value: { email: null, name: "", note: null, segment: null } });
  };
  const openEdit = (item: CustomerDto) => {
    resetEditorErrors();
    setEditor({ mode: "edit", item, value: { email: item["email"], name: item["name"], note: item["note"], segment: item["segment"] } });
  };
  const openDetail = (item: CustomerDto) => {
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

  const deleteItem = (item: CustomerDto) => {
    void deleteMutation.execute({ id: item["id"] });
  };

  return (
    <section className="appforge-generated-resource-page-section">
      <div className="appforge-generated-resource-page-toolbar">
        <h2>Customers</h2>
        <Button type="button" label="Create Customer" onClick={openCreate} />
      </div>
      {list.error ? (
        <Message severity="error" text="Failed to load Customers." />
      ) : null}
      <CustomerTable
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
            <h3>Customer details</h3>
            <div className="appforge-generated-detail-actions">
              <Button type="button" label="Edit" text onClick={() => openEdit(detail)} />
              <Button type="button" label="Close" text onClick={() => setDetail(null)} />
            </div>
          </div>
          <dl className="appforge-generated-detail-fields">
            <div className="appforge-generated-detail-field">
              <dt>Email</dt>
              <dd>{formatDetailValue(detail["email"])}</dd>
            </div>
            <div className="appforge-generated-detail-field">
              <dt>Name</dt>
              <dd>{formatDetailValue(detail["name"])}</dd>
            </div>
            <div className="appforge-generated-detail-field">
              <dt>Note</dt>
              <dd>{formatDetailValue(detail["note"])}</dd>
            </div>
            <div className="appforge-generated-detail-field">
              <dt>Segment</dt>
              <dd>{formatDetailValue(detail["segment"])}</dd>
            </div>
          </dl>
        </section>
      ) : null}
      <Dialog
        visible={editor !== null}
        header={editor?.mode === "edit" ? "Edit Customer" : "Create Customer"}
        modal
        onHide={closeEditor}
      >
        {editor ? (
          editor.mode === "create" ? (
            <CustomerForm
              mode="create"
              value={editor.value}
              onChange={(value) => setEditor({ mode: "create", value })}
              onSubmit={saveEditor}
              submitLabel="Create"
              submitting={saving}
              errors={readFieldErrors(createMutation.error)}
            />
          ) : (
            <CustomerForm
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
