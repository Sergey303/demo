import { Card } from "primereact/card";
import { InputTextarea } from "primereact/inputtextarea";
import type { Appointment, SoapField } from "../entities/types";
import { vetisRequiredSoapError } from "../entities/vetisValidation";
import { useDemoStore } from "../app/context";
import { complaintTags } from "../entities/clinicalDemo";
import { ClinicalAssistant } from "./ClinicalAssistant";

type Props = {
  appointment: Appointment;
  species: string;
  readOnly?: boolean;
  fieldErrors?: Partial<Record<SoapField, string>>;
  highlightFieldPath?: string;
  requiredForVetis?: boolean;
};

const rows = [
  { key: "complaint", label: "Жалоба / анамнез" },
  { key: "soapObjective", label: "Осмотр" },
  { key: "soapAssessment", label: "Оценка / диагноз" },
  { key: "soapPlan", label: "План / назначения" }
] as const;

export function SoapEditor({
  appointment,
  species,
  readOnly = false,
  fieldErrors = {},
  highlightFieldPath,
  requiredForVetis = false
}: Props) {
  const { dispatch } = useDemoStore();
  const selectedTags = appointment.complaintTags ?? [];
  return (
    <Card title="Карточка приёма">
      <div className="stack">
        {requiredForVetis && !readOnly && (
          <div className="vetis-required-hint">
            <i className="pi pi-info-circle" aria-hidden="true" />
            <span>Поля со звёздочкой обязательны для отправки приёма в ВЕТИС.</span>
          </div>
        )}
        {rows.map((row) => {
          const externalError = fieldErrors[row.key];
          const requiredError = requiredForVetis && !appointment[row.key].trim() ? vetisRequiredSoapError : "";
          const highlighted = highlightFieldPath === `soap.${row.key}`;
          const invalid = highlighted || Boolean(externalError) || Boolean(requiredError);
          return (
            <div key={row.key} className="soap-row">
            <label className="field" htmlFor={`soap-${row.key}`}>
              <span>
                {row.label}{requiredForVetis && <span className="required-mark"> *</span>}
              </span>
              <InputTextarea
                id={`soap-${row.key}`}
                autoResize
                rows={3}
                placeholder={row.key === "complaint" && !readOnly ? "Что беспокоит, когда началось, как изменилось состояние…" : undefined}
                value={appointment[row.key]}
                disabled={readOnly}
                className={invalid ? "problem-field" : undefined}
                onChange={(event) =>
                  dispatch({
                    type: "update_soap",
                    appointmentId: appointment.id,
                    field: row.key,
                    value: event.target.value
                  })
                }
              />
              {requiredError && <small className="field-error">{requiredError}</small>}
              {externalError && <small className="field-error">{externalError}</small>}
            </label>
            {row.key === "complaint" && <>
              <div className="clinical-tag-area">
                <span className="clinical-tag-label">Частые причины обращения <small>· можно выбрать несколько</small></span>
                <div className="clinical-tags" role="group" aria-label="Причины обращения">
                  {complaintTags.filter(tag=>!readOnly || selectedTags.includes(tag)).map(tag => (
                    <button key={tag} type="button" className="clinical-tag" aria-pressed={selectedTags.includes(tag)} disabled={readOnly}
                      onClick={()=>dispatch({type:"toggle_complaint_tag",appointmentId:appointment.id,tag})}>
                      {selectedTags.includes(tag) ? "✓ " : "+ "}{tag}
                    </button>
                  ))}
                  {readOnly && selectedTags.length===0 && <span className="clinical-note">Не выбраны</span>}
                </div>
              </div>
              {!readOnly && <ClinicalAssistant key={appointment.id} anamnesis={appointment.complaint} tags={selectedTags} species={species} />}
            </>}
            </div>
          );
        })}
      </div>
    </Card>
  );
}
