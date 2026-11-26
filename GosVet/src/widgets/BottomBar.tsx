import { draftSignature, canModifyVisit } from "../entities/draftCheckpoint";
import { Button } from "primereact/button";
import { useNavigate } from "react-router-dom";
import { useDemoStore } from "../app/context";
import { externalSubmissionsForConfirmedVaccinations } from "../entities/vaccinationDisplay";
import { getMissingVetisSoapFields, hasVetisVaccinationToSend } from "../entities/vetisValidation";
import type { Appointment, AppointmentAction, ExternalSubmission } from "../entities/types";

type Props = {
  appointment: Appointment;
  actions: AppointmentAction[];
  submissions: ExternalSubmission[];
  displayName: string;
  pendingVaccination?: boolean;
};

const hasRequiredExternalData = (
  appointment: Appointment,
  submissions: ExternalSubmission[],
  actions: AppointmentAction[]
) => {
  if(actions.some(a=>!a.vaccineName.trim()||!a.vaccineSeries.trim()||!a.vaccineValidUntil?.trim()))return false;
  const requiredSubmissions = externalSubmissionsForConfirmedVaccinations(submissions, actions);
  if (requiredSubmissions.length === 0 || !hasVetisVaccinationToSend(actions)) return true;
  return getMissingVetisSoapFields(appointment).length === 0 &&
    requiredSubmissions.every((item) => item.status !== "not_ready");
};

const canEditAppointment = (appointment: Appointment) =>
  appointment.status === "draft" ||
  appointment.status === "in_progress" ||
  appointment.status === "requires_external_attention" ||
  appointment.vetisStatus === "fill_error";

const canCompleteAppointment = (appointment: Appointment) =>
  appointment.status === "draft" || appointment.status === "in_progress";

const canRetryAppointment = (appointment: Appointment) =>
  appointment.status === "requires_external_attention" || appointment.vetisStatus === "fill_error";

const isVetisSending = (appointment: Appointment) =>
  appointment.vetisStatus === "queued" || appointment.vetisStatus === "sending";

export function BottomBar({ appointment, actions, submissions, displayName, pendingVaccination=false }: Props) {
  const { dispatch, persistence } = useDemoStore();
  const navigate = useNavigate();
  const editableMode = canEditAppointment(appointment) && canModifyVisit(appointment);
  const dirty = draftSignature(appointment,actions)!==appointment.draftCheckpoint;
  const completeMode = canCompleteAppointment(appointment);
  const retryMode = canRetryAppointment(appointment);
  const canSend = !pendingVaccination && hasRequiredExternalData(appointment, submissions, actions);
  const handleDelete = () => {
    if (!window.confirm(`Удалить приём «${displayName}»?`)) return;
    dispatch({ type: "delete_appointment", appointmentId: appointment.id });
    navigate(`/animal/${appointment.animalId}`);
  };
  const handleComplete = () => {
    const confirmed = window.confirm(
      hasVetisVaccinationToSend(actions) ? "Завершить приём? После подтверждения приём будет отправлен в ВЕТИС." : "Завершить приём без отправки в ВЕТИС?"
    );
    if (!confirmed) return;
    dispatch({ type: "complete", appointmentId: appointment.id });
  };
  return (
    <div className="appointment-bottom-bar">
      <div className="actions-row">
        {editableMode && (
          <Button label="Сохранить черновик" icon="pi pi-save" disabled={pendingVaccination || (!dirty && persistence!=="failed")} onClick={() => dispatch({ type: "save_draft", appointmentId: appointment.id })} />
        )}
        {completeMode && (
          <Button
            label="Завершить приём"
            severity="success"
            disabled={!canSend}
            onClick={handleComplete}
          />
        )}
        {retryMode && (
          <Button
            label={isVetisSending(appointment) ? "Отправка идёт" : "Отправить повторно"}
            severity="success"
            disabled={!canSend || isVetisSending(appointment)}
            onClick={() => dispatch({ type: "retry", appointmentId: appointment.id })}
          />
        )}
        {editableMode && <Button label="Удалить приём" icon="pi pi-trash" severity="danger" outlined onClick={handleDelete} />}
        {editableMode && <span role="status" className="draft-save-status">{pendingVaccination?"Подтвердите или отмените редактирование прививки":persistence==="failed"?"Не удалось сохранить в браузере. Повторите попытку.":persistence==="pending"?"Сохранение в браузере…":dirty?"Есть изменения · автокопия в браузере":appointment.draftSavedAt?"✓ Черновик сохранён · "+new Date(appointment.draftSavedAt).toLocaleTimeString("ru-RU",{hour:"2-digit",minute:"2-digit"}):"Нет изменений"}</span>}
      </div>
    </div>
  );
}
