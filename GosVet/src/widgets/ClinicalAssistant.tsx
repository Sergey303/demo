import { useMemo, useState } from "react";
import { getClinicalDemo, clinicalQuestions, type ClinicalAnswer, type ClinicalAnswers } from "../entities/clinicalDemo";

const options: {value: ClinicalAnswer; label: string}[] = [
  {value:"yes",label:"Да"},{value:"no",label:"Нет"},{value:"unknown",label:"Неизвестно"}
];
const answerLabel = (value: ClinicalAnswer) => options.find(option=>option.value===value)?.label ?? "";
type Props = { anamnesis: string; tags: readonly string[]; species: string; answers: ClinicalAnswers; onAnswer: (id:string,value:ClinicalAnswer|null)=>void };
export function ClinicalAnswerSummary({answers}:{answers:ClinicalAnswers}) {
  const items=clinicalQuestions.filter(q=>answers[q.id]!==undefined);
  if (!items.length) return null;
  return <section className="clinical-answer-summary" aria-label="Ответы владельца"><h4>Ответы владельца</h4><ul>{items.map(q=><li key={q.id}>{q.text} <strong>{answerLabel(answers[q.id])}</strong></li>)}</ul></section>;
}
export function ClinicalAssistant({ anamnesis, tags, species, answers, onAnswer }: Props) {
  const result = useMemo(() => getClinicalDemo(anamnesis,tags,species,answers),[anamnesis,tags,species,answers]);
  const [collapsed,setCollapsed] = useState(false);
  const [showCommon,setShowCommon] = useState(true);
  const [showAll,setShowAll] = useState(false);
  const activeAnswered=result.questions.filter(q=>answers[q.id]!==undefined).length;
  const visibleQuestions=showAll?result.questions:result.questions.filter((q,i)=>i<6 || answers[q.id]!==undefined);
  const renderQuestion=(q:typeof clinicalQuestions[number],retained=false)=><li key={q.id} className="clinical-question" data-question-id={q.id}>
    <strong>{q.text}</strong>
    {!retained && result.questionContext[q.id]?.length>0 && <small>Уточнить: {result.questionContext[q.id].join("; ")}</small>}
    <div className="clinical-answer-options" role="group" aria-label={q.text}>
      {options.map(option=><button key={option.value} type="button" aria-pressed={answers[q.id]===option.value} onClick={()=>onAnswer(q.id,answers[q.id]===option.value?null:option.value)}>{option.label}</button>)}
      {answers[q.id]!==undefined && <button type="button" className="clinical-clear-answer" onClick={()=>onAnswer(q.id,null)} aria-label={`Сбросить ответ: ${q.text}`}>×</button>}
    </div>
  </li>;
  return (
    <aside className="clinical-assistant" aria-label="Подсказки ИИ">
      <div className="clinical-assistant-header">
        <div className="clinical-assistant-heading"><i className="pi pi-sparkles" aria-hidden="true" /><h3>Помощник врача</h3><span className="clinical-demo-badge">Демо ИИ</span></div>
        <button type="button" className="clinical-text-button" aria-expanded={!collapsed} onClick={()=>setCollapsed(x=>!x)}>{collapsed?"Развернуть":"Свернуть"}</button>
      </div>
      {!collapsed && <>
        <p className="clinical-note">Учебные подсказки обновляются по анамнезу и ответам. Локальные правила, не модель ИИ; порядок иллюстративный, не вероятность диагноза. Ответ «Нет» не исключает заболевание.</p>
        <div className="clinical-columns">
          <section className="clinical-section" aria-label="Гипотезы по анамнезу">
            <h4>По анамнезу <span className="clinical-count">{result.hypotheses.length}</span></h4>
            {result.hypotheses.length===0
              ? <p className="clinical-empty">Введите симптомы или выберите причины обращения. Пока нет совпадений в учебном наборе.</p>
              : <ul className="clinical-hypotheses">{result.hypotheses.map(item=><li key={item.id} data-hypothesis-id={item.id}><strong>{item.title}</strong>
                <small>Совпадения: {item.evidence.join(", ")}</small>
                {item.reasons.length>0 && <div className="clinical-hypothesis-feedback">
                  <span className={item.score>0?"clinical-direction-up":item.score<0?"clinical-direction-down":"clinical-direction-neutral"}>{item.score>0?"↑ Больше внимания":item.score<0?"↓ Меньше внимания":"↔ Смешанные ответы"}</span>
                  {item.reasons.map(r=><small key={r.id}>{r.direction>0?"+":"−"} {r.text} — {answerLabel(r.answer)}</small>)}
                </div>}
              </li>)}</ul>}
          </section>
          <section className="clinical-section" aria-label="Уточняющие вопросы">
            <h4>Что уточнить у владельца <span className="clinical-count">{activeAnswered}/{result.questions.length}</span></h4>
            <p className="clinical-note">Отметьте ответ владельца. Неизвестно — без изменения порядка. Повторное нажатие отменяет выбор.</p>
            <ul className="clinical-questions">{visibleQuestions.map(q=>renderQuestion(q))}</ul>
            {result.questions.length>visibleQuestions.length || showAll && result.questions.length>6 ? <button type="button" className="clinical-text-button" aria-expanded={showAll} onClick={()=>setShowAll(x=>!x)}>{showAll?"Скрыть дополнительные вопросы":`Ещё вопросы (${result.questions.length-visibleQuestions.length})`}</button>:null}
            {result.retainedQuestions.length>0 && <details className="clinical-retained"><summary>Сохранённые ответы вне текущих гипотез ({result.retainedQuestions.length})</summary><p className="clinical-note">Не влияют на текущий порядок.</p><ul className="clinical-questions">{result.retainedQuestions.map(q=>renderQuestion(q,true))}</ul></details>}
          </section>
        </div>
        <div className="clinical-common">
          <button type="button" className="clinical-text-button" aria-expanded={showCommon} onClick={()=>setShowCommon(x=>!x)}>{showCommon?"▾":"▸"} Типовые варианты для вида животного (независимо от анамнеза)</button>
          <span className="clinical-note">Не зависят от анамнеза; частоты не измерены.</span>
          {showCommon && <ul className="clinical-common-list">{result.common.map(item=><li key={item}>{item}</li>)}</ul>}
        </div>
        <span className="clinical-sr" role="status" aria-live="polite">{result.hypotheses.length} учебных гипотез; {activeAnswered} ответов; первая гипотеза: {result.hypotheses[0]?.title ?? "нет"}</span>
      </>}
    </aside>
  );
}
