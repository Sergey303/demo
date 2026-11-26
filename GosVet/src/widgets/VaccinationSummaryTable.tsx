import { formatAppointmentDate } from "../entities/appointmentDisplay";
import type { AppointmentAction } from "../entities/types";

type Props = {
  actions: AppointmentAction[];
  canEdit?: (action:AppointmentAction)=>boolean;
  onEdit?: (action:AppointmentAction)=>void;
  onDelete?: (action:AppointmentAction)=>void;
  busy?: boolean;
};

export const isIncompleteVaccination = (action: AppointmentAction) =>
  !action.vaccineName.trim() || !action.vaccineSeries.trim() || !action.vaccineValidUntil?.trim();

export function VaccinationSummaryTable({ actions,canEdit,onEdit,onDelete,busy }: Props) {
  if (actions.length === 0) {
    return (
      <div className="vaccination-empty">
        <i className="pi pi-exclamation-triangle vaccination-warning-icon" aria-hidden="true" />
        <span><strong>Прививка:</strong> отсутствует</span>
      </div>
    );
  }
  const hasIncomplete = actions.some(isIncompleteVaccination);
  return (
    <div className="vaccination-table-wrap" aria-label="Список прививок">
      <table className="vaccination-table">
        <thead>
          <tr>
            <th scope="col">Название</th>
            <th scope="col">Серия</th>
            <th scope="col">Дата окончания действия</th>
            {canEdit && <th scope="col">Действия</th>}
          </tr>
        </thead>
        <tbody>
          {actions.map((action) => (
            <tr key={action.id}>
              <td>{action.vaccineName.trim() || <MissingValue text="препарат не указан" />}</td>
              <td>{action.vaccineSeries || "—"}</td>
              <td>
                {action.vaccineValidUntil?.trim()
                  ? formatAppointmentDate(action.vaccineValidUntil)
                  : <MissingValue text="не указана" />}
              </td>
              {canEdit && <td><div className="vaccine-row-actions">{canEdit(action) ? <>
                <button type="button" disabled={busy} onClick={()=>onEdit?.(action)}>Изменить</button>
                <button type="button" disabled={busy} onClick={()=>onDelete?.(action)}>Удалить прививку</button>
              </>:<span className="muted-line">Только чтение</span>}</div></td>}
            </tr>
          ))}
        </tbody>
      </table>
      {hasIncomplete && (
        <div className="vaccination-table-note">
          <i className="pi pi-exclamation-triangle" aria-hidden="true" />
          <span>Есть незаполненные данные прививки.</span>
        </div>
      )}
    </div>
  );
}

function MissingValue({ text }: { text: string }) {
  return (
    <span className="vaccination-missing-value">
      <i className="pi pi-exclamation-triangle" aria-hidden="true" /> {text}
    </span>
  );
}
