import { useMemo, useState } from "react";
import { Button } from "primereact/button";
import { Card } from "primereact/card";
import { Tag } from "primereact/tag";
import { useNavigate } from "react-router-dom";
import { createAnimalAppointmentDraft } from "../app/appointmentFactory";
import { useDemoStore } from "../app/context";
import { appointmentDisplayName, formatAppointmentDate } from "../entities/appointmentDisplay";
import { appointmentStatusText } from "../entities/status";
import {
  getMissingVetisSoapFields,
  hasVetisVaccinationToSend,
  resolveVetisSendStatus,
  vetisInlineStatusLabel,
  vetisStatusSeverity
} from "../entities/vetisValidation";
import { externalSubmissionsForConfirmedVaccinations, vaccinationSummaryText } from "../entities/vaccinationDisplay";
import type { Animal, Appointment, AppointmentAction, ExternalSubmission, Owner, SoapField } from "../entities/types";
import { ActionEditor } from "./ActionEditor";
import { AppointmentHistory } from "./AppointmentHistory";
import { BottomBar } from "./BottomBar";
import { ExternalPanel } from "./ExternalPanel";
import { DatePickerField } from "./DatePickerField";
import { SoapEditor } from "./SoapEditor";
import { VetisErrorPanel } from "./VetisErrorPanel";
import { VetisStatusPanel } from "./VetisStatusPanel";

type Props = {
  appointment: Appointment;
  owner: Owner;
  animal: Animal;
  history: Appointment[];
  submissions: ExternalSubmission[];
  showProblem: boolean;
  highlightActionId?: string;
  highlightFieldPath?: string;
  actions: AppointmentAction[];
};

const soapFieldFromPath = (fieldPath: string | null): SoapField | null => {
  if (!fieldPath?.startsWith("soap.")) return null;
  const key = fieldPath.slice("soap.".length);
  if (key === "complaint" || key === "soapObjective" || key === "soapAssessment" || key === "soapPlan") return key;
  return null;
};

const isEditableAppointment = (appointment: Appointment) =>
  appointment.status === "draft" ||
  appointment.status === "in_progress" ||
  appointment.status === "requires_external_attention" ||
  appointment.vetisStatus === "fill_error";

export function AppointmentWorkspace(props: Props) {
  const { appointment, owner, animal, history, submissions, showProblem, highlightActionId, highlightFieldPath, actions } = props;
  const { state, dispatch } = useDemoStore();
  const navigate = useNavigate();
  const displayName = appointmentDisplayName(appointment, owner, animal);
  const [followUpDate, setFollowUpDate] = useState("");
  const [createdFollowUp, setCreatedFollowUp] = useState<{ id: string; dateText: string } | null>(null);
  const vaccinationsText = useMemo(() => vaccinationSummaryText(actions), [actions]);
  const externalSubmissions = useMemo(
    () => externalSubmissionsForConfirmedVaccinations(submissions, actions),
    [actions, submissions]
  );
  const vetisStatus = resolveVetisSendStatus(appointment, externalSubmissions);
  const vetisRequired = hasVetisVaccinationToSend(actions);
  const vetisMissingSoapFields = useMemo(
    () => (vetisRequired ? getMissingVetisSoapFields(appointment) : []),
    [appointment, vetisRequired]
  );
  const vetisStatusLabel = vetisInlineStatusLabel(appointment, externalSubmissions, actions);
  const canEdit = isEditableAppointment(appointment);
  const shouldShowReadinessPanel =
    externalSubmissions.length > 0 &&
    appointment.status !== "completed_internal" &&
    appointment.status !== "completed_with_external_success" &&
    appointment.vetisStatus !== "queued" &&
    appointment.vetisStatus !== "sending" &&
    appointment.vetisStatus !== "sent";
  const soapFieldErrors = useMemo(() => {
    const result: Partial<Record<SoapField, string>> = {};
    for (const submission of externalSubmissions) {
      if (submission.status !== "failed_requires_edit") continue;
      const field = soapFieldFromPath(submission.problemFieldPath);
      if (field && submission.humanErrorMessage) result[field] = submission.humanErrorMessage;
    }
    return result;
  }, [externalSubmissions]);
  const vaccinationFieldErrors = useMemo(() => {
    const result: Record<string, string> = {};
    for (const submission of externalSubmissions) {
      if (submission.status !== "failed_requires_edit" || !submission.problemFieldPath?.startsWith("vaccination.")) continue;
      result[`${submission.actionId}:${submission.problemFieldPath}`] = submission.humanErrorMessage;
    }
    return result;
  }, [externalSubmissions]);
  const historyVaccinations = (item: Appointment) =>
    vaccinationSummaryText(state.actions.filter((action) => action.appointmentId === item.id));
  const handleCreateFollowUp = () => {
    if (!followUpDate) return;
    const draft = createAnimalAppointmentDraft(state, owner, animal, "Повторный приём", followUpDate);
    dispatch({ type: "add_appointment", appointment: draft.appointment });
    setCreatedFollowUp({ id: draft.appointment.id, dateText: formatAppointmentDate(draft.appointment.startedAt) });
    setFollowUpDate("");
  };
  return (
    <section className="stack-lg">
      <Card title={`Приём ${displayName}`} className="appointment-hero">
        <div className="appointment-summary">
          <Tag className="status-chip" value={appointmentStatusText[appointment.status]} severity="warning" />
          <div className="appointment-summary-details">
            <div><strong>Клиент:</strong> {owner.fullName} · {owner.phone}</div>
            <div><strong>Животное:</strong> {animal.name} ({animal.species}) · чип {animal.chip}</div>
            <div className="wide"><strong>Врач:</strong> {appointment.doctor} · <strong>Причина:</strong> {appointment.reason}</div>
            <div className="wide"><strong>Прививка:</strong> {vaccinationsText}</div>
            <div className="wide vetis-inline-status">
              <strong>ВЕТИС:</strong>
              <Tag
                className="status-chip"
                value={vetisStatusLabel}
                severity={vetisStatus === "not_started" && !vetisRequired ? "secondary" : vetisStatusSeverity(vetisStatus)}
              />
              {vetisRequired && vetisMissingSoapFields.length > 0 && canEdit && (
                <span className="muted-line">не хватает обязательных полей карточки приёма</span>
              )}
            </div>
          </div>
          <div className="actions-row appointment-summary-actions">
            <Button label="Страница животного" size="small" outlined onClick={() => navigate(`/animal/${animal.id}`)} />
          </div>
        </div>
      </Card>
      <div className="workspace-grid with-bottom-bar">
        <div className="workspace-main">
          <VetisErrorPanel submissions={externalSubmissions} />
          <SoapEditor
            appointment={appointment}
            species={animal.species}
            readOnly={!canEdit}
            fieldErrors={soapFieldErrors}
            highlightFieldPath={highlightFieldPath}
            requiredForVetis={vetisRequired}
          />
          <ActionEditor
            appointment={appointment}
            actions={actions}
            readOnly={!canEdit}
            externalFieldErrors={vaccinationFieldErrors}
            highlightActionId={highlightActionId}
            highlightFieldPath={highlightFieldPath}
          />
        </div>
        <div className="workspace-side">
          <VetisStatusPanel appointment={appointment} actions={actions} submissions={externalSubmissions} />
          {shouldShowReadinessPanel && <ExternalPanel submissions={externalSubmissions} actions={actions} showProblem={showProblem} />}
          <Card title="История приёмов">
            <AppointmentHistory
              appointments={history}
              activeAppointmentId={appointment.id}
              getAppointmentDisplayName={(item) => appointmentDisplayName(item, owner, animal)}
              getVaccinationSummary={historyVaccinations}
            />
          </Card>
        </div>
      </div>
      <Card title="Повторный приём" className="follow-up-card">
        <div className="follow-up-content">
          <div className="follow-up-copy">
            <strong>Запланировать следующий визит</strong>
            <span className="muted-line">Создаст отдельный приём на выбранную дату. Текущий приём останется открытым.</span>
          </div>
          <div className="follow-up-row">
            <label className="field compact-field">
              <span>Дата повторного приёма</span>
              <DatePickerField value={followUpDate} onChange={setFollowUpDate} />
            </label>
            <Button label="Создать" icon="pi pi-plus" disabled={!followUpDate} onClick={handleCreateFollowUp} />
          </div>
          {createdFollowUp && (
            <div className="follow-up-result" role="status">
              <i className="pi pi-check-circle" aria-hidden="true" />
              <span>Повторный приём запланирован {createdFollowUp.dateText}</span>
              <Button
                label="Открыть"
                size="small"
                outlined
                onClick={() => navigate(`/appointment/${createdFollowUp.id}`)}
              />
            </div>
          )}
        </div>
      </Card>
      <BottomBar appointment={appointment} actions={actions} submissions={submissions} displayName={displayName} />
    </section>
  );
}
