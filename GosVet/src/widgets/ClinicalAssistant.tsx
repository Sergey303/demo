import { useMemo, useRef, useState } from "react";
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
  const assistantRef=useRef<HTMLElement>(null);
  const [collapsed,setCollapsed] = useState(false);
  const [showCommon,setShowCommon] = useState(false);
  const [showAll,setShowAll] = useState(false);
  const [showReasons,setShowReasons] = useState(false);
  const [showAnswers,setShowAnswers] = useState(false);
  const activeAnswered=result.questions.filter(q=>answers[q.id]!==undefined).length;
  const pending=result.questions.filter(q=>answers[q.id]===undefined);
  const answered=result.questions.filter(q=>answers[q.id]!==undefined);
  const visibleQuestions=showAll?pending:pending.slice(0,1);
  const hiddenCount=pending.length-visibleQuestions.length;
  const priorityLabel=(id:string) => {
    const p=result.questionPriority[id];
    return p.tier===3?"Различает близкие гипотезы":p.tier===2?"Различает варианты":p.tier===1?(p.affected===1?"Уточняет одну гипотезу":"Общий для гипотез признак"):"Общий контекст";
  };
  const renderQuestion=(q:typeof clinicalQuestions[number],retained=false)=><li key={q.id} className={`clinical-question ${!retained && result.nextQuestion?.id===q.id?"clinical-next-question":""}`} data-question-id={q.id}>
    {!retained && answers[q.id]===undefined && <div className="clinical-question-priority">
      {result.nextQuestion?.id===q.id && <span className="clinical-next-label">Следующий вопрос</span>}
      <span>{priorityLabel(q.id)}</span>
    </div>}
    <strong>{q.text}</strong>
    {!retained && result.questionContext[q.id]?.length>0 && <small>Уточнить: {result.questionContext[q.id].join("; ")}</small>}
    {!retained && answers[q.id]===undefined && result.questionPriority[q.id].closePairs.length>0 &&
      <small>Сопоставляет: {result.questionPriority[q.id].closePairs[0].first} / {result.questionPriority[q.id].closePairs[0].second}</small>}
    <div className="clinical-answer-options" role="group" aria-label={q.text}>
      {options.map(option=><button key={option.value} type="button" aria-pressed={answers[q.id]===option.value} onClick={event=>{
        const keyboard=event.detail===0;
        onAnswer(q.id,answers[q.id]===option.value?null:option.value);
        if(keyboard && !retained && answers[q.id]===undefined)
          requestAnimationFrame(()=>{ const root=assistantRef.current; (root?.querySelector<HTMLButtonElement>(".clinical-next-question .clinical-answer-options button") ?? root?.querySelector<HTMLButtonElement>(".clinical-saved-answers button"))?.focus(); });
      }}>{option.label}</button>)}
      {answers[q.id]!==undefined && <button type="button" className="clinical-clear-answer" onClick={()=>onAnswer(q.id,null)} aria-label={`Сбросить ответ: ${q.text}`}>×</button>}
    </div>
  </li>;
  return (
    <aside ref={assistantRef} className="clinical-assistant" aria-label="Подсказки ИИ">
      <div className="clinical-assistant-header">
        <div className="clinical-assistant-heading"><i className="pi pi-sparkles" aria-hidden="true" /><h3>Помощник врача</h3><span className="clinical-demo-badge">Демо ИИ</span></div>
        <button type="button" className="clinical-text-button" aria-expanded={!collapsed} onClick={()=>setCollapsed(x=>!x)}>{collapsed?"Развернуть":"Свернуть"}</button>
      </div>
      {!collapsed && <>
        <p className="clinical-note">Учебные локальные правила, не ИИ и не диагностическая оценка. Ответ «Нет» не исключает заболевание.</p>
        <div className="clinical-columns">
          <section className="clinical-section" aria-label="Гипотезы по анамнезу">
            <h4>По анамнезу <span className="clinical-count">{result.hypotheses.length}</span></h4>
            {result.hypotheses.length===0
              ? <p className="clinical-empty">Введите симптомы или выберите причины обращения. Пока нет совпадений в учебном наборе.</p>
              : <ul className="clinical-hypotheses">{result.hypotheses.map(item=><li key={item.id} data-hypothesis-id={item.id}><strong>{item.title}</strong>
                {showReasons && <small>Совпадения: {item.evidence.join(", ")}</small>}
                {item.reasons.length>0 && <div className="clinical-hypothesis-feedback">
                  <span className={item.score>0?"clinical-direction-up":item.score<0?"clinical-direction-down":"clinical-direction-neutral"}>{item.score>0?"↑ Больше внимания":item.score<0?"↓ Меньше внимания":"↔ Смешанные ответы"}</span>
                  {showReasons && item.reasons.map(r=><small key={r.id}>{r.direction>0?"+":"−"} {r.text} — {answerLabel(r.answer)}</small>)}
                </div>}
              </li>)}</ul>}
            {result.hypotheses.length>0 && <button type="button" className="clinical-text-button" aria-expanded={showReasons} onClick={()=>setShowReasons(x=>!x)}>{showReasons?"Скрыть обоснования":"Почему эти гипотезы?"}</button>}
          </section>
          <section className="clinical-section" aria-label="Уточняющие вопросы">
            <h4>Что уточнить у владельца <span className="clinical-count">{activeAnswered}/{result.questions.length}</span></h4>
            <p className="clinical-note">Сначала наиболее различающий учебный вопрос. Приоритет не отражает медицинскую срочность.</p>
            {result.pendingCount===0 && <p className="clinical-empty" role="status">Учебные вопросы исчерпаны. Это не означает, что данных достаточно для диагноза.</p>}
            <ul className="clinical-questions">{visibleQuestions.map(q=>renderQuestion(q))}</ul>
            {hiddenCount>0 || showAll && result.pendingCount>1 ? <button type="button" className="clinical-text-button" aria-expanded={showAll} onClick={()=>setShowAll(x=>!x)}>{showAll?"Скрыть дополнительные вопросы":`Ещё вопросы (${hiddenCount})`}</button>:null}
            {answered.length>0 && <div className="clinical-saved-answers">
              <button type="button" className="clinical-text-button" aria-expanded={showAnswers} onClick={()=>setShowAnswers(x=>!x)}>{showAnswers?"Скрыть ответы":"Полученные ответы"} ({answered.length})</button>
              {showAnswers && <ul className="clinical-questions">{answered.map(q=>renderQuestion(q))}</ul>}
            </div>}
            {result.retainedQuestions.length>0 && <details className="clinical-retained"><summary>Сохранённые ответы вне текущих гипотез ({result.retainedQuestions.length})</summary><p className="clinical-note">Не влияют на текущий порядок.</p><ul className="clinical-questions">{result.retainedQuestions.map(q=>renderQuestion(q,true))}</ul></details>}
          </section>
        </div>
        <div className="clinical-common">
          <button type="button" className="clinical-text-button" aria-expanded={showCommon} onClick={()=>setShowCommon(x=>!x)}>{showCommon?"▾":"▸"} Типовые варианты для вида животного</button>
          {showCommon && <span className="clinical-note">Не зависят от анамнеза; частоты не измерены.</span>}
          {showCommon && <ul className="clinical-common-list">{result.common.map(item=><li key={item}>{item}</li>)}</ul>}
        </div>
        <span className="clinical-sr" role="status" aria-live="polite">{result.hypotheses.length} учебных гипотез; {activeAnswered} ответов; первая гипотеза: {result.hypotheses[0]?.title ?? "нет"}</span>
      </>}
    </aside>
  );
}
