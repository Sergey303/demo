import { examObservations, getVisitAssistant, type ClinicalObservations, type ObservationValue } from "../entities/clinicalStages";
import type { Appointment, SoapField } from "../entities/types";

type Result=ReturnType<typeof getVisitAssistant>;
const options:{value:ObservationValue;label:string}[]=[
  {value:"present",label:"Наблюдалось"},{value:"absent",label:"Не наблюдалось"},{value:"unknown",label:"Не оценено"}
];
const label=(value:ObservationValue)=>options.find(o=>o.value===value)?.label??"";
type ExamProps={result:Result;observations:ClinicalObservations;onChange:(id:string,value:ObservationValue|null)=>void};
export function ExamAssistant({result,observations,onChange}:ExamProps) {
  const render=(o:typeof examObservations[number])=><li key={o.id} className="visit-observation" data-observation-id={o.id}>
    <strong>{o.label}</strong>
    <div role="group" aria-label={o.label} className="clinical-answer-options">
      {options.map(option=><button key={option.value} type="button" aria-pressed={observations[o.id]===option.value}
        onClick={()=>onChange(o.id,observations[o.id]===option.value?null:option.value)}>{option.label}</button>)}
    </div>
  </li>;
  return <details className="visit-assistant" open>
    <summary>Помощник · осмотр <span className="clinical-count">{result.recordedObservations}/{result.activeObservations.length}</span></summary>
    <p className="clinical-note">Учебные пункты по текущим гипотезам. Отмечайте только то, что действительно наблюдалось; выбор не заменяет описание осмотра.</p>
    {result.activeObservations.length>0?<ul className="visit-observation-list">{result.activeObservations.map(render)}</ul>:<p className="clinical-note">Нет связанных учебных пунктов. Заполните осмотр самостоятельно.</p>}
    {result.savedInactive.length>0&&<details><summary>Ранее отмеченные наблюдения ({result.savedInactive.length})</summary><ul className="visit-observation-list">{result.savedInactive.map(render)}</ul></details>}
  </details>;
}
export function AssessmentAssistant({result}:{result:Result}) {
  return <details className="visit-assistant" open>
    <summary>Помощник · сопоставление гипотез</summary>
    <p className="clinical-note">Сопоставление учебных признаков, а не диагностический рейтинг. Отсутствие признака не исключает заболевание.</p>
    {result.evidence.length===0?<p className="clinical-note">Нет совпадений в учебном наборе. Диагноз определяет врач.</p>:
      <div className="visit-evidence-list">{result.evidence.map(h=><div className="visit-evidence" key={h.id} data-evidence-id={h.id}>
        <strong>{h.title}</strong>
        <small className="clinical-note">Анамнез: {h.cues.join(", ")}</small>
        <div className="visit-evidence-columns">
          <div><h5>За · учебные признаки</h5>{h.support.length?<ul>{h.support.map((item,i)=><li key={i}>{item.text}<small>{item.source}</small></li>)}</ul>:<p>Нет отмеченных</p>}</div>
          <div><h5>Против · признаки для уточнения</h5>{h.against.length?<ul>{h.against.map((item,i)=><li key={i}>{item.text}<small>{item.source}</small></li>)}</ul>:<p>Нет отмеченных</p>}</div>
        </div>
        {h.missing.length>0&&<small className="clinical-note">Не оценено: {h.missing.join("; ")}</small>}
      </div>)}</div>}
  </details>;
}
export function PlanAssistant({result}:{result:Result}) {
  return <details className="visit-assistant" open>
    <summary>Помощник · план</summary>
    <p className="clinical-note">Учебные подсказки для формулировки плана. Конкретные обследования, назначения и сроки выбирает врач.</p>
    <ul className="visit-plan-list">
      {result.planTopics.map(topic=><li key={topic}>{topic}</li>)}
      <li>Указать цель дальнейшего обследования или причину, по которой оно не требуется.</li>
      <li>Зафиксировать согласованный с владельцем план и критерии повторной оценки.</li>
    </ul>
  </details>;
}
export function VisitReview({result}:{result:Result}) {
  const goTo=(field:SoapField)=>document.getElementById(`soap-${field}`)?.focus();
  return <section className="visit-assistant visit-review" aria-label="Проверка полноты записи">
    <div className="visit-review-header"><strong>Перед завершением · проверка записи</strong><span className="clinical-count">{result.filled}/4 полей</span></div>
    <p className="clinical-note">Не блокирует завершение. Проверяет только наличие текста и явно отмеченные расхождения, а не медицинскую правильность.</p>
    {result.missing.length>0?<div className="visit-missing"><span>Не заполнено:</span>{result.missing.map(f=><button key={f.key} type="button" className="clinical-text-button" onClick={()=>goTo(f.key)}>{f.label} ↗</button>)}</div>:<p className="clinical-note">Во всех четырёх полях есть текст; полнота содержания не проверена.</p>}
    <p className="clinical-note">Ответов владельца: {result.answeredQuestions}. Отмечено пунктов осмотра: {result.recordedObservations}/{result.activeObservations.length}.</p>
    {result.differences.length>0?<div className="visit-differences"><strong>Уточнить различия между анамнезом и осмотром</strong>
      <ul>{result.differences.map(item=><li key={item.id}><strong>{item.label}</strong><small>Владелец: {item.answer} · Осмотр: {item.observation}</small></li>)}</ul>
      <small>Признаки могли измениться со временем. Это не автоматическое заключение о противоречии.</small></div>:<p className="clinical-note">По явно отмеченным сопоставимым признакам расхождений не найдено. Остальные данные не проверены.</p>}
  </section>;
}
export function ExamSummary({appointment}:{appointment:Appointment}) {
  const observations=appointment.clinicalObservations??{};
  const items=examObservations.filter(o=>observations[o.id]!==undefined);
  return items.length>0?<section className="clinical-answer-summary" aria-label="Наблюдения осмотра"><h4>Наблюдения осмотра</h4><ul>{items.map(o=><li key={o.id}>{o.label} — <strong>{label(observations[o.id])}</strong></li>)}</ul></section>:null;
}
