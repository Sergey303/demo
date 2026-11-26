import { useMemo, useState } from "react";
import { Card } from "primereact/card";
import { Button } from "primereact/button";
import { createVaccinationActionDraft, type VaccinationActionDraft } from "../app/appointmentFactory";
import { useDemoStore } from "../app/context";
import { vaccineDemoOptions } from "../demo-data/vaccineDemoOptions";
import type { Appointment, AppointmentAction } from "../entities/types";
import { VaccinationEditForm } from "./VaccinationEditForm";
import { isIncompleteVaccination, VaccinationSummaryTable } from "./VaccinationSummaryTable";

type Props = {
  appointment: Appointment;
  actions: AppointmentAction[];
  highlightActionId?: string;
  highlightFieldPath?: string;
  readOnly?: boolean;
  externalFieldErrors?: Record<string, string>;
};
const fieldKey = (actionId: string, field: string) => `${actionId}:${field}`;
const normalize = (value: string) => value.trim().toLowerCase();
export function ActionEditor({
  appointment,
  actions,
  highlightActionId,
  highlightFieldPath,
  readOnly = false,
  externalFieldErrors = {}
}: Props) {
  const { state, dispatch } = useDemoStore();
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [, setNameValidity] = useState<Record<string, boolean>>({});
  const [newDraft, setNewDraft] = useState<VaccinationActionDraft | null>(null);
  const options = useMemo(() => {
    const local = state.dictionaries.map((item) => item.name);
    return Array.from(new Set([...vaccineDemoOptions, ...local]));
  }, [state.dictionaries]);
  const markTouched = (actionId: string, field: string) =>
    setTouched((prev) => ({ ...prev, [fieldKey(actionId, field)]: true }));
  const touchAll = (actionId: string) => {
    markTouched(actionId, "vaccineName");
    markTouched(actionId, "vaccineSeries");
    markTouched(actionId, "vaccineValidUntil");
  };
  const isTouched = (actionId: string, field: string) => Boolean(touched[fieldKey(actionId, field)]);
  const isKnownVaccineName = (value: string) => {
    const normalized = normalize(value);
    return Boolean(normalized) && options.some((item) => normalize(item) === normalized);
  };
  const updateNewAction = (patch: Partial<AppointmentAction>) => {
    setNewDraft((prev) => (prev ? { ...prev, action: { ...prev.action, ...patch } } : prev));
  };
  const handleAdd = () => {
    if (newDraft || readOnly) return;
    setNewDraft(createVaccinationActionDraft(appointment.id));
  };
  const handleCancelNew = () => {
    if (!newDraft) return;
    setTouched((prev) => {
      const next = { ...prev };
      delete next[fieldKey(newDraft.action.id, "vaccineName")];
      delete next[fieldKey(newDraft.action.id, "vaccineSeries")];
      delete next[fieldKey(newDraft.action.id, "vaccineValidUntil")];
      return next;
    });
    setNameValidity((prev) => {
      const next = { ...prev };
      delete next[newDraft.action.id];
      return next;
    });
    setNewDraft(null);
  };
  const handleConfirmNew = () => {
    if (!newDraft || readOnly) return;
    touchAll(newDraft.action.id);
    const valid =
      isKnownVaccineName(newDraft.action.vaccineName) &&
      Boolean(newDraft.action.vaccineSeries.trim()) &&
      Boolean(newDraft.action.vaccineValidUntil?.trim());
    setNameValidity((prev) => ({ ...prev, [newDraft.action.id]: isKnownVaccineName(newDraft.action.vaccineName) }));
    if (!valid) return;
    dispatch({
      type: "add_vaccination_action",
      action: newDraft.action,
      submission: { ...newDraft.submission, status: "ready", humanErrorMessage: "", problemFieldPath: null }
    });
    setNewDraft(null);
  };
  return (
    <Card title="Прививки">
      <div className="stack">
        <VaccinationSummaryTable actions={actions} />
        {actions.map((action, index) => {
          const actionHasExternalError = Object.keys(externalFieldErrors).some((key) => key.startsWith(`${action.id}:`));
          const shouldShowEditor = !readOnly && (isIncompleteVaccination(action) || highlightActionId === action.id || actionHasExternalError);
          if (!shouldShowEditor) return null;
          const nameExternalError = externalFieldErrors[fieldKey(action.id, "vaccination.vaccineName")];
          const seriesExternalError = externalFieldErrors[fieldKey(action.id, "vaccination.vaccineSeries")];
          const validUntilExternalError = externalFieldErrors[fieldKey(action.id, "vaccination.vaccineValidUntil")];
          const nameInvalid = isTouched(action.id, "vaccineName") && !isKnownVaccineName(action.vaccineName);
          const seriesInvalid = isTouched(action.id, "vaccineSeries") && !action.vaccineSeries.trim();
          const validUntilInvalid = isTouched(action.id, "vaccineValidUntil") && !action.vaccineValidUntil?.trim();
          return (
            <VaccinationEditForm
              key={action.id}
              action={action}
              index={index}
              options={options}
              disabled={readOnly}
              nameInvalid={nameInvalid}
              seriesInvalid={seriesInvalid}
              validUntilInvalid={validUntilInvalid}
              nameExternalError={nameExternalError}
              seriesExternalError={seriesExternalError}
              validUntilExternalError={validUntilExternalError}
              highlightName={highlightActionId === action.id && highlightFieldPath === "vaccination.vaccineName"}
              highlightSeries={highlightActionId === action.id && highlightFieldPath === "vaccination.vaccineSeries"}
              highlightValidUntil={highlightActionId === action.id && highlightFieldPath === "vaccination.vaccineValidUntil"}
              onNameChange={(value) => dispatch({ type: "update_action", actionId: action.id, vaccineName: value })}
              onSeriesChange={(value) => dispatch({ type: "update_action", actionId: action.id, vaccineSeries: value })}
              onValidUntilChange={(value) => {
                markTouched(action.id, "vaccineValidUntil");
                dispatch({ type: "update_action", actionId: action.id, vaccineValidUntil: value });
              }}
              onAddDictionary={(value) => dispatch({ type: "add_dictionary", value })}
              onNameValidityChange={(valid) => setNameValidity((prev) => ({ ...prev, [action.id]: valid }))}
              onTouched={(field) => markTouched(action.id, field)}
            />
          );
        })}
        {newDraft && !readOnly && (
          <div className="vaccination-new-editor">
            <VaccinationEditForm
              action={newDraft.action}
              index={actions.length}
              options={options}
              disabled={readOnly}
              nameInvalid={isTouched(newDraft.action.id, "vaccineName") && !isKnownVaccineName(newDraft.action.vaccineName)}
              seriesInvalid={isTouched(newDraft.action.id, "vaccineSeries") && !newDraft.action.vaccineSeries.trim()}
              validUntilInvalid={isTouched(newDraft.action.id, "vaccineValidUntil") && !newDraft.action.vaccineValidUntil?.trim()}
              highlightName={false}
              highlightSeries={false}
              highlightValidUntil={false}
              titleLabel="Новая прививка"
              onNameChange={(value) => updateNewAction({ vaccineName: value })}
              onSeriesChange={(value) => updateNewAction({ vaccineSeries: value })}
              onValidUntilChange={(value) => {
                markTouched(newDraft.action.id, "vaccineValidUntil");
                updateNewAction({ vaccineValidUntil: value });
              }}
              onAddDictionary={(value) => dispatch({ type: "add_dictionary", value })}
              onNameValidityChange={(valid) => setNameValidity((prev) => ({ ...prev, [newDraft.action.id]: valid }))}
              onTouched={(field) => markTouched(newDraft.action.id, field)}
            />
            <div className="vaccination-confirm-actions">
              <Button label="Отмена" outlined onClick={handleCancelNew} />
              <Button label="Подтвердить" icon="pi pi-check" onClick={handleConfirmNew} />
            </div>
          </div>
        )}
        {!newDraft && !readOnly && <div className="vaccination-editor-actions">
          <Button label="Добавить прививку" icon="pi pi-plus" outlined onClick={handleAdd} />
        </div>}
      </div>
    </Card>
  );
}
