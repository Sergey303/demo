import { useMemo, useState } from "react";
import { getClinicalDemo } from "../entities/clinicalDemo";

type Props = { anamnesis: string; tags: readonly string[]; species: string };
export function ClinicalAssistant({ anamnesis, tags, species }: Props) {
  const result = useMemo(() => getClinicalDemo(anamnesis,tags,species),[anamnesis,tags,species]);
  const [collapsed,setCollapsed] = useState(false);
  const [showCommon,setShowCommon] = useState(true);
  return (
    <aside className="clinical-assistant" aria-label="Подсказки ИИ">
      <div className="clinical-assistant-header">
        <div className="clinical-assistant-heading"><i className="pi pi-sparkles" aria-hidden="true" /><h3>Помощник врача</h3><span className="clinical-demo-badge">Демо ИИ</span></div>
        <button type="button" className="clinical-text-button" aria-expanded={!collapsed} onClick={()=>setCollapsed(x=>!x)}>{collapsed?"Развернуть":"Свернуть"}</button>
      </div>
      {!collapsed && <>
        <p className="clinical-note">Учебные подсказки обновляются по мере ввода. Локальные правила, не модель ИИ; не диагноз и не клиническая рекомендация.</p>
        <div className="clinical-columns">
          <section className="clinical-section" aria-label="Гипотезы по анамнезу">
            <h4>По анамнезу <span className="clinical-count">{result.hypotheses.length}</span></h4>
            {result.hypotheses.length===0
              ? <p className="clinical-empty">Введите симптомы или выберите причины обращения. Пока нет совпадений в учебном наборе.</p>
              : <ul className="clinical-hypotheses">{result.hypotheses.map(item=><li key={item.id}><strong>{item.title}</strong><small>Совпадения: {item.evidence.join(", ")}</small></li>)}</ul>}
          </section>
          <section className="clinical-section" aria-label="Уточняющие вопросы">
            <h4>Что уточнить у владельца</h4>
            <ul className="clinical-questions">{result.questions.map(question=><li key={question}>{question}{result.questionContext[question]?.length>0 && <small>Уточнить: {result.questionContext[question].join("; ")}</small>}</li>)}</ul>
          </section>
        </div>
        <div className="clinical-common">
          <button type="button" className="clinical-text-button" aria-expanded={showCommon} onClick={()=>setShowCommon(x=>!x)}>{showCommon?"▾":"▸"} Типовые варианты для вида животного (независимо от анамнеза)</button>
          <span className="clinical-note">Не зависят от анамнеза; частоты не измерены.</span>
          {showCommon && <ul className="clinical-common-list">{result.common.map(item=><li key={item}>{item}</li>)}</ul>}
        </div>
        <span className="clinical-sr" role="status" aria-live="polite">{result.hypotheses.length} учебных гипотез</span>
      </>}
    </aside>
  );
}
