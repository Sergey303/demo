// ------------------------------------------------------------------------------
// GENERATED FILE - source: campaigns/endpoints.json
// DO NOT EDIT MANUALLY.
// ------------------------------------------------------------------------------

import { useState } from "react";
import { Button } from "primereact/button";
import { Dialog } from "primereact/dialog";
import { Message } from "primereact/message";
import { TabPanel, TabView } from "primereact/tabview";
import { readFieldErrors } from "../../runtime/validationErrorRuntime";
import type { CampaignDto } from "../types/CampaignDto.generated";
import type { CreateCampaignRequest } from "../types/CreateCampaignRequest.generated";
import type { UpdateCampaignRequest } from "../types/UpdateCampaignRequest.generated";
import { CampaignForm } from "../components/CampaignForm.generated";
import { CampaignTable } from "../components/CampaignTable.generated";
import { useCampaignControllerListQuery } from "../../operations/useCampaignControllerListQuery.react-query.generated";
import { useCampaignControllerCreateMutation } from "../../operations/useCampaignControllerCreateMutation.react-mutation.generated";
import { useCampaignControllerUpdateMutation } from "../../operations/useCampaignControllerUpdateMutation.react-mutation.generated";
import { useCampaignControllerDeleteMutation } from "../../operations/useCampaignControllerDeleteMutation.react-mutation.generated";
import { useCampaignControllerSuggestQuery } from "../../operations/useCampaignControllerSuggestQuery.react-query.generated";
import { useCampaignControllerOptionsQuery } from "../../operations/useCampaignControllerOptionsQuery.react-query.generated";
import type { ListCampaignRequest } from "../types/ListCampaignRequest.generated";

export function CampaignsPage() {
  return (
    <main className="appforge-generated-page">
      <header className="appforge-generated-page-header">
        <h1>Campaigns</h1>
      </header>
      <TabView>
        <TabPanel header="Campaigns">
          <CampaignSection />
        </TabPanel>
      </TabView>
    </main>
  );
}

type CampaignEditorState =
  | { readonly mode: "create"; readonly value: CreateCampaignRequest }
  | { readonly mode: "edit"; readonly item: CampaignDto; readonly value: UpdateCampaignRequest }
  | null;

function CampaignSection() {
  const [listRequest, setListRequest] = useState<ListCampaignRequest>({
    page: 1,
    pageSize: 10,
    filters: [],
    sort: [],
  });
  const [detail, setDetail] = useState<CampaignDto | null>(null);
  const list = useCampaignControllerListQuery({ request: listRequest });
  const [suggestRequest, setSuggestRequest] = useState({ field: "__none", query: "" });
  const suggest = useCampaignControllerSuggestQuery({
    field: suggestRequest.field,
    request: { query: suggestRequest.query, take: 10 },
  });
  const suggestionItems = suggestRequest.field !== "__none"
    ? { [suggestRequest.field]: (suggest.data ?? []).map((item) => item.value) }
    : {};
  const StatusNameOptions = useCampaignControllerOptionsQuery({ field: "statusName" });
  const optionItems = {
    statusName: StatusNameOptions.data ?? [],
  };
  const createMutation = useCampaignControllerCreateMutation();
  const updateMutation = useCampaignControllerUpdateMutation();
  const deleteMutation = useCampaignControllerDeleteMutation();
  const [editor, setEditor] = useState<CampaignEditorState>(null);
  const items = list.data?.items ?? [];
  const totalCount = list.data?.totalCount ?? 0;
  const saving = createMutation.isPending || updateMutation.isPending;

  const resetEditorErrors = () => {
    createMutation.reset();
    updateMutation.reset();
  };

  const openCreate = () => {
    resetEditorErrors();
    setEditor({ mode: "create", value: { audienceDescription: "", createdAt: "", messageTemplate: "", name: "", note: null, statusId: "" } });
  };
  const openEdit = (item: CampaignDto) => {
    resetEditorErrors();
    setEditor({ mode: "edit", item, value: { audienceDescription: item["audienceDescription"], createdAt: item["createdAt"], messageTemplate: item["messageTemplate"], name: item["name"], note: item["note"], statusId: item["statusId"] } });
  };
  const openDetail = (item: CampaignDto) => {
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

  const deleteItem = (item: CampaignDto) => {
    void deleteMutation.execute({ id: item["id"] });
  };

  return (
    <section className="appforge-generated-resource-page-section">
      <div className="appforge-generated-resource-page-toolbar">
        <h2>Campaigns</h2>
        <Button type="button" label="Create Campaign" onClick={openCreate} />
      </div>
      {list.error ? (
        <Message severity="error" text="Failed to load Campaigns." />
      ) : null}
      <CampaignTable
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
            <h3>Campaign details</h3>
            <div className="appforge-generated-detail-actions">
              <Button type="button" label="Edit" text onClick={() => openEdit(detail)} />
              <Button type="button" label="Close" text onClick={() => setDetail(null)} />
            </div>
          </div>
          <dl className="appforge-generated-detail-fields">
            <div className="appforge-generated-detail-field">
              <dt>Audience Description</dt>
              <dd>{formatDetailValue(detail["audienceDescription"])}</dd>
            </div>
            <div className="appforge-generated-detail-field">
              <dt>Message Template</dt>
              <dd>{formatDetailValue(detail["messageTemplate"])}</dd>
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
              <dt>Status</dt>
              <dd>{formatDetailValue(detail["statusName"])}</dd>
            </div>
          </dl>
        </section>
      ) : null}
      <Dialog
        visible={editor !== null}
        header={editor?.mode === "edit" ? "Edit Campaign" : "Create Campaign"}
        modal
        onHide={closeEditor}
      >
        {editor ? (
          editor.mode === "create" ? (
            <CampaignForm
              mode="create"
              value={editor.value}
              onChange={(value) => setEditor({ mode: "create", value })}
              onSubmit={saveEditor}
              submitLabel="Create"
              submitting={saving}
              errors={readFieldErrors(createMutation.error)}
            />
          ) : (
            <CampaignForm
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
