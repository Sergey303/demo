import { useState } from "react";
import { Button } from "primereact/button";
import { Card } from "primereact/card";
import { Tag } from "primereact/tag";
import { useNavigate } from "react-router-dom";
import { appointmentDateInputValue, isAppointmentOnDate, sortAppointmentsByDateDesc, todayDateInputValue } from "../app/selectors";
import { appointmentDisplayName, formatAppointmentDate } from "../entities/appointmentDisplay";
import { compactAppointmentStatusText } from "../entities/status";
import { vaccinationSummaryText } from "../entities/vaccinationDisplay";
import type { Appointment } from "../entities/types";
import { useDemoStore } from "../app/context";
import { DatePickerField } from "../widgets/DatePickerField";

export function TodayAppointmentsPage() {
  const { state } = useDemoStore();
  const navigate = useNavigate();
  const [selectedDate, setSelectedDate] = useState(todayDateInputValue());
  const example = state.appointments.find((item) => item.id === "demo-001" && item.clinicId === state.selectedClinicId);
  const exampleDate = example ? appointmentDateInputValue(example) : "";
  const items = sortAppointmentsByDateDesc(
    state.appointments.filter(
      (item) => item.clinicId === state.selectedClinicId && isAppointmentOnDate(item, selectedDate)
    )
  );
  const getDisplayName = (appointment: Appointment) => {
    const animal = state.animals.find((item) => item.id === appointment.animalId);
    const owner = state.owners.find((item) => item.id === appointment.ownerId);
    return animal && owner ? appointmentDisplayName(appointment, owner, animal) : "Приём без карточки";
  };
  const getVaccinations = (appointmentId: string) =>
    vaccinationSummaryText(state.actions.filter((action) => action.appointmentId === appointmentId));
  return (
    <section className="stack">
      <Card title="Мои приёмы">
        <div className="today-toolbar">
          <div className="today-toolbar-copy">Откройте приём за выбранную дату или начните новый через поиск животного.</div>
          <div className="appointments-date-filter">
            <label className="field compact-field">
              <span>Дата</span>
              <DatePickerField value={selectedDate} onChange={setSelectedDate} />
            </label>
            {exampleDate && <Button label={`Пример: ${formatAppointmentDate(example?.startedAt)}`} outlined onClick={() => setSelectedDate(exampleDate)} />}
            <Button label="Сегодня" outlined onClick={() => setSelectedDate(todayDateInputValue())} />
            <Button label="Новый приём" icon="pi pi-plus" onClick={() => navigate("/search")} />
          </div>
        </div>
      </Card>
      {items.length === 0 && <Card title="Приёмов нет">На выбранную дату приёмов пока нет.</Card>}
      {items.map((item) => {
        const animal = state.animals.find((row) => row.id === item.animalId);
        const owner = state.owners.find((row) => row.id === item.ownerId);
        return (
          <Card key={item.id} title={getDisplayName(item)}>
            <div className="appointment-list-item">
              <div className="appointment-list-main">
                <div>{item.reason}</div>
                <div className="muted-line"><strong>Прививка:</strong> {getVaccinations(item.id)}</div>
                {animal && owner && <div className="muted-line">{animal.name} · {owner.fullName}</div>}
              </div>
              <div className="appointment-list-actions">
                <Tag className="status-chip" value={compactAppointmentStatusText[item.status]} severity="warning" />
                <Button size="small" label="Открыть" onClick={() => navigate(`/appointment/${item.id}`)} />
              </div>
            </div>
          </Card>
        );
      })}
    </section>
  );
}
