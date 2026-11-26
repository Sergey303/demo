// Synthetic demonstration of workflow support, not a clinical decision system.
import { getClinicalDemo, clinicalQuestions, type ClinicalAnswers } from "./clinicalDemo.ts";
import type { Appointment, SoapField } from "./types";
export type ObservationValue = "present" | "absent" | "unknown";
export type ClinicalObservations = Record<string, ObservationValue>;
type Observation = {id:string; label:string; hypotheses:string[]; ownerQuestion?:string; planTopic:string};
export const examObservations: Observation[] = [
  {id:"abdomen-discomfort",label:"Болезненность при обследовании живота",hypotheses:["digestive","parasites"],planTopic:"Обосновать необходимость дальнейшего обследования ЖКТ"},
  {id:"stool-observed",label:"Жидкий стул наблюдался во время приёма",hypotheses:["digestive","parasites"],ownerQuestion:"loose-stool",planTopic:"Указать, нужны ли дополнительные данные о стуле"},
  {id:"skin-change",label:"Видимые изменения кожи",hypotheses:["skin"],ownerQuestion:"skin-changes",planTopic:"Описать локализацию изменений и цель дополнительного обследования"},
  {id:"nasal-discharge",label:"Выделения из носа при осмотре",hypotheses:["respiratory","cat-upper"],ownerQuestion:"nasal-discharge",planTopic:"Указать, какие дополнительные данные о дыхании необходимы"},
  {id:"breathing-change",label:"Изменение дыхания при осмотре",hypotheses:["respiratory"],planTopic:"Зафиксировать наблюдение и решение врача о дальнейшей оценке"},
  {id:"movement-pain",label:"Болезненность при движении",hypotheses:["musculoskeletal"],ownerQuestion:"limb-pain",planTopic:"Описать область осмотра и обоснование дальнейшего обследования"},
  {id:"urination-discomfort",label:"Признаки дискомфорта при мочеиспускании наблюдались",hypotheses:["urinary"],ownerQuestion:"urinary-pain",planTopic:"Указать, какие данные о мочеиспускании необходимо уточнить"},
  {id:"weight-change",label:"Снижение массы относительно документированной предыдущей",hypotheses:["metabolic","nonspecific"],ownerQuestion:"weight-change",planTopic:"Сопоставить измерения и определить необходимость дополнительной оценки"},
  {id:"activity",label:"Сниженная активность при осмотре",hypotheses:["nonspecific"],ownerQuestion:"low-activity",planTopic:"Уточнить динамику состояния и критерии повторной оценки"},
  {id:"eye-discharge",label:"Выделения из глаз при осмотре",hypotheses:["cat-upper"],ownerQuestion:"eye-discharge",planTopic:"Описать наблюдения со стороны глаз и дыхательных путей"},
  {id:"ear-discharge",label:"Выделения из уха при осмотре",hypotheses:["dog-ear"],ownerQuestion:"ear-discharge",planTopic:"Указать локализацию и цель дополнительного обследования уха"}
];
export const isObservationId = (id:string) => examObservations.some(o=>o.id===id);
export const isObservationValue = (value:unknown):value is ObservationValue => value==="present" || value==="absent" || value==="unknown";
const fields: {key:SoapField;label:string}[] = [
  {key:"complaint",label:"Жалоба / анамнез"},{key:"soapObjective",label:"Осмотр"},
  {key:"soapAssessment",label:"Оценка / диагноз"},{key:"soapPlan",label:"План / назначения"}
];
const answerLabel=(a:ClinicalAnswers[string])=>a==="yes"?"Да":a==="no"?"Нет":"Неизвестно";
export function getVisitAssistant(appointment:Appointment,species:string) {
  const answers=appointment.clinicalAnswers??{};
  const observations=appointment.clinicalObservations??{};
  const history=getClinicalDemo(appointment.complaint,appointment.complaintTags??[],species,answers);
  const activeIds=new Set(history.hypotheses.map(h=>h.id));
  const activeObservations=examObservations.filter(o=>o.hypotheses.some(id=>activeIds.has(id)));
  const savedInactive=examObservations.filter(o=>!activeObservations.includes(o)&&observations[o.id]!==undefined);
  const evidence=history.hypotheses.map(h=>{
    const related=activeObservations.filter(o=>o.hypotheses.includes(h.id));
    return {
      id:h.id,title:h.title,cues:h.evidence,
      support:[...h.reasons.filter(r=>r.direction>0).map(r=>({text:r.text+" — "+answerLabel(r.answer),source:"Ответ владельца"})),
        ...related.filter(o=>observations[o.id]==="present").map(o=>({text:o.label,source:"Осмотр"}))],
      against:[...h.reasons.filter(r=>r.direction<0).map(r=>({text:r.text+" — "+answerLabel(r.answer),source:"Ответ владельца"})),
        ...related.filter(o=>observations[o.id]==="absent").map(o=>({text:o.label+" — не наблюдалось",source:"Осмотр"}))],
      missing:related.filter(o=>observations[o.id]===undefined||observations[o.id]==="unknown").map(o=>o.label)
    };
  });
  // Compare explicit observations only. Owner reports may concern another time.
  const differences=activeObservations.flatMap(o=>{
    const q=o.ownerQuestion && clinicalQuestions.find(q=>q.id===o.ownerQuestion);
    if(!q)return [];
    const a=answers[q.id],v=observations[o.id];
    if ((a==="yes"&&v==="absent")||(a==="no"&&v==="present"))
      return [{id:o.id,label:o.label,question:q.text,answer:answerLabel(a),observation:v==="present"?"Наблюдалось":"Не наблюдалось"}];
    return [];
  });
  const planTopics=[...new Set(activeObservations.map(o=>o.planTopic))].slice(0,4);
  const filled=fields.filter(f=>appointment[f.key].trim()).length;
  const missing=fields.filter(f=>!appointment[f.key].trim());
  const recordedObservations=activeObservations.filter(o=>observations[o.id]!==undefined).length;
  const answeredQuestions=history.questions.filter(q=>answers[q.id]!==undefined).length;
  return {history,activeObservations,savedInactive,evidence,differences,planTopics,filled,missing,recordedObservations,answeredQuestions};
}
