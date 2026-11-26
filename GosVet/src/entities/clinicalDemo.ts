// Static illustrative data for the public demo, not a clinical knowledge base.
// No frequency estimates, diagnostic probabilities or treatment recommendations.
export const complaintTags = [
  "Снижение аппетита", "Рвота", "Диарея", "Вялость", "Зуд",
  "Кашель", "Чихание", "Хромота", "Частое мочеиспускание",
  "Повышенная жажда", "Профилактический осмотр", "Вакцинация"
] as const;
export type ComplaintTag = typeof complaintTags[number];
type Rule = { id: string; title: string; cues: string[]; questions: string[]; species?: "cat" | "dog" };
const rules: Rule[] = [
  {id:"digestive", title:"Заболевания ЖКТ", cues:["рвот","тошн","диаре","понос","жидкий стул","аппетит","не ест","отказ от еды"], questions:["Когда появились симптомы? Как часто повторяются?","Менялся ли корм, могло ли животное съесть посторонний предмет?","Есть ли кровь в рвоте или стуле?"]},
  {id:"parasites",title:"Паразитарные заболевания ЖКТ",cues:["диаре","понос","жидкий стул","рвот"],questions:["Когда проводилась последняя обработка от паразитов?","Есть ли контакт с другими животными?"]},
  {id:"skin",title:"Дерматологические заболевания (в том числе аллергические)",cues:["зуд","чешет","расчес","расчёс","сыпь","шерст"],questions:["Где именно зуд и изменения кожи?","Были ли новые корма, средства ухода или обработки от паразитов?"]},
  {id:"respiratory",title:"Заболевания дыхательных путей",cues:["кашл","кашел","кашель","чих","выделения из носа","одыш","тяжело дыш"],questions:["Кашель или чихание: когда возникают, в покое или при нагрузке?","Есть ли выделения из носа или затруднение дыхания?"]},
  {id:"musculoskeletal",title:"Боль или заболевания опорно-двигательного аппарата",cues:["хром","лап","травм","не наступает"],questions:["Когда началась хромота? Была ли травма?","На какую конечность животное опирается хуже?"]},
  {id:"urinary",title:"Заболевания мочевыводящих путей",cues:["мочеиспуск","мочится","моча","мочи","лоток","лотк"],questions:["Как часто животное мочится и какой объём мочи выделяется?","Есть ли болезненность, кровь или попытки без выделения мочи?"]},
  {id:"metabolic",title:"Метаболические или почечные нарушения",cues:["жажд","много пь","похуд","снижение веса","частое мочеиспуск"],questions:["Изменились ли масса тела, аппетит и объём выпитой воды?","Какие хронические заболевания и лекарства известны?"]},
  {id:"nonspecific",title:"Неспецифические признаки: требуется уточнение",cues:["вял","апат","слаб","температур","аппетит","не ест"],questions:["Когда изменилось поведение?","Есть ли дополнительные признаки: рвота, диарея, изменение мочеиспускания или дыхания?"]},
  {id:"cat-upper",title:"Заболевания верхних дыхательных путей у кошек",species:"cat",cues:["чих","выделения из носа","выделения из глаз"],questions:["Есть ли выделения из глаз и контакт с другими кошками?"]},
  {id:"dog-ear",title:"Заболевания наружного уха у собак",species:"dog",cues:["трясет головой","трясёт головой","чешет ухо","зуд уха"],questions:["Есть ли запах, выделения или болезненность уха?"]}
];
const common = {
  cat:["Заболевания ЖКТ","Заболевания мочевыводящих путей","Стоматологические заболевания","Дерматологические заболевания"],
  dog:["Заболевания ЖКТ","Дерматологические заболевания","Заболевания наружного уха","Заболевания опорно-двигательного аппарата"],
  other:["Заболевания ЖКТ","Дерматологические заболевания","Заболевания дыхательных путей"]
};
const genericQuestions = ["Когда начались симптомы и как менялись?","Изменились ли аппетит, питьё, активность или туалет?","Какие заболевания, лекарства и профилактические процедуры известны?"];
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
export function getClinicalDemo(anamnesis: string, tags: readonly string[], species: string) {
  const kind = /кошк|кот/i.test(species) ? "cat" : /собак|пес|пёс/i.test(species) ? "dog" : "other";
  // Each selected tag is an independent explicit input, not a medical fact inferred from free text.
  const matches = rules.filter(rule => !rule.species || rule.species === kind)
    .map(rule => ({rule, evidence:rule.cues.filter(cue => matchCue(anamnesis,cue) || tags.some(tag => matchCue(tag,cue)))}))
    .filter(row=>row.evidence.length>0);
  const hypotheses = matches.slice(0,5).map(({rule,evidence}) => ({id:rule.id,title:rule.title,evidence}));
  const questions = [...new Set(matches.flatMap(({rule})=>rule.questions))].slice(0,6);
  const questionContext = Object.fromEntries(questions.map(question => [question, matches.filter(({rule})=>rule.questions.includes(question)).map(({rule})=>rule.title)]));
  return { hypotheses, common: common[kind], questions: questions.length?questions:genericQuestions, questionContext };
}
