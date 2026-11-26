// Static illustrative data for the public demo, not a clinical knowledge base.
// No frequency estimates, diagnostic probabilities or treatment recommendations.
export const complaintTags = [
  "Снижение аппетита", "Рвота", "Диарея", "Вялость", "Зуд",
  "Кашель", "Чихание", "Хромота", "Частое мочеиспускание",
  "Повышенная жажда", "Профилактический осмотр", "Вакцинация"
] as const;
export type ComplaintTag = typeof complaintTags[number];
export type ClinicalAnswer = "yes" | "no" | "unknown";
export type ClinicalAnswers = Record<string, ClinicalAnswer>;
type Question = { id: string; text: string; relates: string[]; yes: string[]; no: string[] };
type Rule = { id: string; title: string; cues: string[]; questions: string[]; species?: "cat" | "dog" };
// The yes/no links are invented for demonstrating interaction, not validated clinical weights.
// A negative answer never excludes a disease. Questions with no links only collect context.
const question = (id: string, text: string, relates: string[], yes: string[] = [], no: string[] = []): Question =>
  ({ id,text,relates,yes,no });
export const clinicalQuestions: Question[] = [
  question("diet-change","Менялся ли корм незадолго до симптомов?",["digestive","skin"],["digestive"]),
  question("foreign-object","Могло ли животное проглотить посторонний предмет?",["digestive"],["digestive"]),
  question("loose-stool","Есть ли жидкий стул?",["digestive","parasites"],["digestive","parasites"]),
  question("parasite-exposure","Был ли контакт с животными с известными паразитами?",["parasites"],["parasites"]),
  question("blood-stool","Замечали ли кровь в рвоте или стуле?",["digestive","parasites"]),
  question("new-care","Появились ли новые средства ухода?",["skin"],["skin"]),
  question("skin-changes","Есть ли видимые изменения кожи?",["skin"],["skin"]),
  question("nasal-discharge","Есть ли выделения из носа?",["respiratory","cat-upper"],["respiratory","cat-upper"]),
  question("breathing","Наблюдается ли затруднение дыхания?",["respiratory"]),
  question("trauma","Была ли травма перед появлением хромоты?",["musculoskeletal"],["musculoskeletal"]),
  question("limb-pain","Есть ли болезненность при движении?",["musculoskeletal"],["musculoskeletal"]),
  question("urinary-pain","Есть ли признаки болезненного мочеиспускания?",["urinary"],["urinary"]),
  question("water-volume","Стало ли животное пить заметно больше?",["metabolic","urinary"],["metabolic"]),
  question("weight-change","Заметили ли снижение массы тела?",["metabolic","nonspecific"],["metabolic"]),
  question("low-activity","Стало ли животное менее активным?",["nonspecific"],["nonspecific"]),
  question("eye-discharge","Есть ли выделения из глаз?",["cat-upper"],["cat-upper"]),
  question("ear-discharge","Есть ли выделения из уха?",["dog-ear"],["dog-ear"]),
  question("sudden-onset","Начались ли изменения внезапно?",[]),
  question("other-signs","Есть ли другие изменения состояния, кроме описанных?",[]),
  question("chronic","Есть ли известные хронические заболевания?",[])
];
// All simple yes/no cues above use the same synthetic inverse link for a negative answer.
for (const item of clinicalQuestions) item.no = [...item.yes];
export const isClinicalQuestionId = (id: string) => clinicalQuestions.some(item=>item.id===id);
export const isClinicalAnswer = (value: unknown): value is ClinicalAnswer => value==="yes" || value==="no" || value==="unknown";
const rules: Rule[] = [
  {id:"digestive", title:"Заболевания ЖКТ", cues:["рвот","тошн","диаре","понос","жидкий стул","аппетит","не ест","отказ от еды"], questions:["diet-change","loose-stool","foreign-object","blood-stool"]},
  {id:"parasites",title:"Паразитарные заболевания ЖКТ",cues:["диаре","понос","жидкий стул","рвот"],questions:["parasite-exposure","loose-stool","blood-stool"]},
  {id:"skin",title:"Дерматологические заболевания (в том числе аллергические)",cues:["зуд","чешет","расчес","расчёс","сыпь","шерст"],questions:["skin-changes","new-care","diet-change"]},
  {id:"respiratory",title:"Заболевания дыхательных путей",cues:["кашл","кашел","кашель","чих","выделения из носа","одыш","тяжело дыш"],questions:["nasal-discharge","breathing"]},
  {id:"musculoskeletal",title:"Боль или заболевания опорно-двигательного аппарата",cues:["хром","лап","травм","не наступает"],questions:["trauma","limb-pain"]},
  {id:"urinary",title:"Заболевания мочевыводящих путей",cues:["мочеиспуск","мочится","моча","мочи","лоток","лотк"],questions:["urinary-pain","water-volume"]},
  {id:"metabolic",title:"Метаболические или почечные нарушения",cues:["жажд","много пь","похуд","снижение веса","частое мочеиспуск"],questions:["water-volume","weight-change"]},
  {id:"nonspecific",title:"Неспецифические признаки: требуется уточнение",cues:["вял","апат","слаб","температур","аппетит","не ест"],questions:["low-activity","weight-change"]},
  {id:"cat-upper",title:"Заболевания верхних дыхательных путей у кошек",species:"cat",cues:["чих","выделения из носа","выделения из глаз"],questions:["eye-discharge","nasal-discharge"]},
  {id:"dog-ear",title:"Заболевания наружного уха у собак",species:"dog",cues:["трясет головой","трясёт головой","чешет ухо","зуд уха"],questions:["ear-discharge"]}
];
const common = {
  cat:["Заболевания ЖКТ","Заболевания мочевыводящих путей","Стоматологические заболевания","Дерматологические заболевания"],
  dog:["Заболевания ЖКТ","Дерматологические заболевания","Заболевания наружного уха","Заболевания опорно-двигательного аппарата"],
  other:["Заболевания ЖКТ","Дерматологические заболевания","Заболевания дыхательных путей"]
};
const genericQuestions = ["sudden-onset","other-signs","chronic"];
const normalize = (s: string) => s.toLowerCase().replace(/ё/g,"е").replace(/\s+/g," ").trim();
// Conservative rule matching: ignore simple explicit negation in a clause.
// Ambiguous/unsupported language is not interpreted as clinical fact.
function matchCue(text: string, cue: string) {
  const target = normalize(cue);
  return text.split(/[.!?;\n,]/).some(clause => {
    const normalized = normalize(clause);
    let start = normalized.indexOf(target);
    while (start >= 0) {
      const before = normalized.slice(Math.max(0,start-36),start);
      const after = normalized.slice(start + target.length,start + target.length + 26);
      const negatedBefore = /(?:^|\s)(?:нет|без|не отмечает|не было|отрицает|отсутствует)\s+(?:[а-я]+\s+){0,2}$/.test(before);
      const negatedAfter = /^[а-я]*\s+(?:нет|не было|отсутствует|не наблюдается|не отмечается)(?:\s|$)/.test(after);
      if (!negatedBefore && !negatedAfter) return true;
      start = normalized.indexOf(target,start+target.length);
    }
    return false;
  });
}
export function getClinicalDemo(anamnesis: string, tags: readonly string[], species: string, answers: ClinicalAnswers = {}) {
  const kind = /кошк|кот/i.test(species) ? "cat" : /собак|пес|пёс/i.test(species) ? "dog" : "other";
  const matches = rules.filter(rule => !rule.species || rule.species === kind)
    .map(rule => ({rule, evidence:rule.cues.filter(cue => matchCue(anamnesis,cue) || tags.some(tag => matchCue(tag,cue)))}))
    .filter(row=>row.evidence.length>0);
  // Interleave questions across competing hypotheses so one branch does not crowd out another.
  const questionIds = [...new Set(Array.from({length: Math.max(0,...matches.map(row=>row.rule.questions.length))},
    (_,i)=>matches.map(row=>row.rule.questions[i]).filter(Boolean)).flat())];
  const activeIds = [...questionIds, ...genericQuestions];
  const activeQuestions = activeIds.map(id=>clinicalQuestions.find(q=>q.id===id)!);
  const active = new Set(activeIds);
  const hypotheses = matches.map(({rule,evidence}, index) => {
    const reasons = activeQuestions.flatMap<{id:string;text:string;answer:ClinicalAnswer;direction:number}>(q => {
      const answer=answers[q.id];
      if (answer==="yes" && q.yes.includes(rule.id)) return [{id:q.id,text:q.text,answer,direction:1}];
      if (answer==="no" && q.no.includes(rule.id)) return [{id:q.id,text:q.text,answer,direction:-1}];
      return [];
    });
    const score = reasons.reduce((sum,r)=>sum+r.direction,0);
    return {id:rule.id,title:rule.title,evidence,reasons,score,index};
  }).sort((a,b)=>b.score-a.score || a.index-b.index);
  const retainedQuestions = clinicalQuestions.filter(q=>!active.has(q.id) && answers[q.id] !== undefined);
  const questionContext = Object.fromEntries(activeQuestions.map(q=>[q.id,matches.filter(({rule})=>q.relates.includes(rule.id)).map(({rule})=>rule.title)]));
  // Pure, synthetic question ordering: compare changes to the relative score
  // of each pair under the two possible answers. No clinical probabilities.
  // Unanswered questions that can change a close ordering come first.
  const relation = (q: Question, id: string, answer: "yes"|"no") =>
    answer==="yes" ? Number(q.yes.includes(id)) : -Number(q.no.includes(id));
  const questionPriority = Object.fromEntries(activeQuestions.map((q,index)=>{
    const pairs: {first:string;second:string;close:boolean;weight:number}[]=[];
    for (let i=0;i<hypotheses.length;i++) for (let j=i+1;j<hypotheses.length;j++){
      const a=hypotheses[i], b=hypotheses[j];
      const yes=relation(q,a.id,"yes")-relation(q,b.id,"yes");
      const no=relation(q,a.id,"no")-relation(q,b.id,"no");
      if (yes===no) continue;
      const gap=a.score-b.score;
      const close=gap+Math.min(yes,no)<=0 && gap+Math.max(yes,no)>=0;
      pairs.push({first:a.title,second:b.title,close,weight:1/(1+gap)});
    }
    const closePairs=pairs.filter(pair=>pair.close);
    const affected=hypotheses.filter(h=>relation(q,h.id,"yes")!==relation(q,h.id,"no")).length;
    const tier=closePairs.length?3:pairs.length?2:affected?1:0;
    const weight=(closePairs.length?closePairs:pairs).reduce((sum,pair)=>sum+pair.weight,0);
    return [q.id,{tier,weight,index,closePairs,pairs,affected}];
  }));
  const pending=activeQuestions.filter(q=>answers[q.id]===undefined).sort((a,b)=>{
    const x=questionPriority[a.id],y=questionPriority[b.id];
    return y.tier-x.tier || y.weight-x.weight || x.index-y.index;
  });
  const answered=activeQuestions.filter(q=>answers[q.id]!==undefined);
  return { hypotheses, common: common[kind], questions: [...pending,...answered], nextQuestion:pending[0]??null,
    questionPriority, pendingCount:pending.length, retainedQuestions, questionContext };
}
