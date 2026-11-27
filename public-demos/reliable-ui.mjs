import {createReliable, SCENARIOS, LABELS, hashOf} from './reliable-model.mjs';
const $=id=>document.getElementById(id);
const el=(tag,text,cls)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n;};
const append=(parent,...items)=>{parent.append(...items);return parent;};
const field=(label,value)=>append(el('div',undefined,'rj-field'),el('span',label),el('strong',String(value)));
const code=(data)=>el('pre',JSON.stringify(data,null,2),'rj-code');
const link=(file,label)=>{const a=el('a',label);a.href='https://github.com/Sergey303/demo/blob/main/dotnet-outbox/'+file;return a;};
let model=createReliable();
const hints={
  lost:'Первый запрос будет записан, но CRM не увидит ответ.',repeat:'Повторите тот же запрос. Сравните количество записей.',
  process:'Принятие ещё не означает выполнение. Обработайте очередь.',get:'Теперь отправитель может проверить известный ID.',
  send:'Сначала примите исходную заявку.',intakeRollback:'Имитируем подтверждённый откат до фиксации.',
  conflict:'Тот же ключ, другое содержимое. Исходная запись не должна измениться.',
  workerRollback:'Откат незавершённой транзакции обработки не добавляет ошибок handler.',
  failure:'Каждая зафиксированная ошибка увеличит attempts. Время ожидания виртуальное.',
  externalLost:'Узнайте, почему локальная гарантия не переносится на внешний сервис.'
};
function counts(l){
  return {jobs:l.jobs.length,outbox:l.jobs.length,results:l.jobs.filter(j=>j.state==='done').length,
    queued:l.jobs.filter(j=>j.state==='queued').length,failed:l.jobs.filter(j=>j.state==='failed').length};
}
function laneCard(l,i){
  const c=counts(l);
  const card=el('article',undefined,'rj-lane');card.id='rj-lane-'+i;
  const sender=append(el('section',undefined,'rj-side'),el('h3','Отправитель · CRM'),
    field('Попытки POST',l.client.posts),field('Что знает CRM',l.client.observation),
    field('Известный ID',l.client.knownId??'Неизвестен'),field('Последний ответ',l.client.last));
  const receiver=append(el('section',undefined,'rj-side rj-receiver'),el('h3','Получатель · окно наблюдателя'),
    field('Принято записей',c.jobs),field('В очереди',c.queued),
    field('Записано результатов',c.results),field('Требуют проверки',c.failed));
  const list=el('ul',undefined,'rj-list');
  for(const j of l.jobs)list.append(el('li',j.id+' · '+j.state+' · ошибок обработчика: '+j.attempts+(j.state==='done'?' · Заявка обработана':'')));
  receiver.append(list);
  return append(card,el('h2',l.name),sender,receiver);
}
function state(l){
  const c=counts(l),part=el('section',undefined,'rj-state');
  part.append(el('h3',l.name),el('p','Committed: jobs='+c.jobs+' / outbox='+c.outbox+' / results='+c.results+' · virtual clock='+l.clock+' с'));
  const jobs=l.jobs.map(j=>({id:j.id,key:j.key,input:j.text,payload_sha256:hashOf(j.text),status:j.state,result:j.state==='done'?{business:'Заявка обработана (иллюстрация)',WordCount:j.words,Sha256:hashOf(j.text)}:null}));
  const outbox=l.jobs.map(j=>({id:j.eventId,job_id:j.id,attempts:j.attempts,next_attempt_at:j.nextAttemptAt,processed_at:j.processedAt,last_error:j.lastError}));
  part.append(el('h4','jobs'),code(jobs),el('h4','outbox · проекция модели'),code(outbox),el('h4','Знание отправителя'),code(l.client));
  const trace=el('ol',undefined,'rj-trace');
  for(const event of l.events)trace.append(el('li',event.phase+' — '+event.message));
  return append(part,el('h4','Порядок событий'),trace);
}
function render(){
  const s=model.snapshot(),a=s.available,scenario=SCENARIOS[s.scenario];
  $('rj-progress').textContent='Шаг '+s.index+' из '+scenario.steps.length;
  const summary=$('rj-comparison');
  summary.hidden=s.scenario!=='main';$('rj-assumption').hidden=s.scenario!=='main';
  const figures=s.lanes.map(l=>counts(l));
  summary.textContent=s.scenario==='main'?'С защитой: записей '+figures[0].jobs+', результатов '+figures[0].results+'. Без защиты: записей '+figures[1].jobs+', результатов '+figures[1].results+'.':'';
  $('rj-lanes').replaceChildren(...s.lanes.map(laneCard));
  $('rj-lanes').hidden=s.scenario==='external';
  $('rj-external').hidden=!s.external;
  $('rj-primary').hidden=!a.primary;
  $('rj-primary').textContent=LABELS[a.primary]??'';
  $('rj-hint').textContent=a.primary?hints[a.primary]:s.external?'Требуется сверка получателя.':s.extra?'Новый ключ создал отдельную queued операцию. Здесь проверяем только её принятие, без обработки; для нового опыта выберите сценарий или сброс.':s.scenario==='main'?'Сравните результаты. Для повтора после done/failed выберите «Откат при обработке» или «Пять ошибок обработчика».':s.lanes[0].jobs.some(j=>j.state==='failed')?'Попытки исчерпаны. Нужна проверка, не автоматический перезапуск.':'Сравните записанный результат и знание отправителя.';
  $('rj-extras').replaceChildren();
  for(const id of ['replay','terminalGet','reprocess','newKey']){
    if(!a[id])continue;
    const b=el('button',LABELS[id],'secondary');b.type='button';b.id='rj-'+id;b.onclick=()=>act(id);$('rj-extras').append(b);
  }
  $('rj-state').replaceChildren(...s.lanes.map(state));
  $('rj-contract').replaceChildren(...s.lanes.map(l=>append(el('section'),el('h3',l.name),code({method:'POST /jobs',key:l.client.key,body:{text:l.client.input},payload_sha256:hashOf(l.client.input),lastObserved:l.client.last,GET:l.client.knownId?'/jobs/'+l.client.knownId:'Недоступен: ID неизвестен'}))));
}
function act(id){
  if(!model.action(id))return;
  render();
  if($('rj-primary').hidden){
    const next=id==='replay'?'rj-terminalGet':id==='terminalGet'?'rj-newKey':id==='newKey'?'rj-terminalGet':null;
    (next&&$(next)||$('rj-extras').querySelector('button')||$('rj-hint')).focus();
  }
}
function restart(scenario){
  if(model.snapshot().index&&!confirm('Начать заново? Учебные изменения будут сброшены.')){$('rj-scenario').value=model.snapshot().scenario;return;}
  model=createReliable(scenario);render();
}
for(const [id,s] of Object.entries(SCENARIOS)){
  const opt=el('option',s.title);opt.value=id;$('rj-scenario').append(opt);
}
$('rj-scenario').onchange=()=>restart($('rj-scenario').value);
$('rj-reset').onclick=()=>restart(model.snapshot().scenario);
$('rj-primary').onclick=()=>act(model.available().primary);
const rows=[
 ['I01','Не более одной записи на ключ','HTTP-E2E: один ID (20 запросов); PG-PRIMITIVE: один выигравший INSERT',['tests/smoke.py','tests/ConcurrencyIntegrationTests.cs'],'NOT TESTED: retention, разные ключи; исторический smoke не проверял SQL counts'],
 ['I02','Job и outbox вместе','SOURCE: транзакция приёма','src/Program.cs','NOT TESTED: отказ между INSERT/commit, SQL counts'],
 ['I03','Повтор того же ключа и текста — прежний ID; конфликт 409','HTTP-E2E: один ID, 409; BROWSER-MODEL: повтор и конфликт','tests/smoke.py','NOT TESTED: целевая потеря ответа после commit'],
 ['I04','Result и processed_at вместе','SOURCE: worker; HTTP-E2E: GET done и WordCount/SHA-256',['src/OutboxWorker.cs','tests/smoke.py'],'NOT TESTED: crash после UPDATE и число writes'],
 ['I05','Одна удерживаемая блокировка строки','PG-PRIMITIVE: SKIP LOCKED, две строки/соединения','tests/ConcurrencyIntegrationTests.cs','NOT TESTED: fairness, kill worker'],
 ['I06','Откатившийся claim снова доступен','PG-PRIMITIVE: явный rollback/reclaim','tests/ConcurrencyIntegrationTests.cs','NOT TESTED: реальный разрыв соединения'],
 ['I07','SQL rollback не расходует бюджет handler','SOURCE: граница catch; BROWSER-MODEL: rollback','src/OutboxWorker.cs','NOT TESTED: живой SQL failure'],
 ['I08','Пять committed ошибок → failed','SOURCE: terminal write; UNIT: RetryPolicy/JobLogic; BROWSER-MODEL: 5 failures',['src/OutboxWorker.cs','src/JobLogic.cs','tests/JobLogicTests.cs'],'NOT TESTED: terminal handler exhaustion в реальном worker'],
 ['I09','POST не изменяет terminal result','SOURCE: повтор; BROWSER-MODEL: replay done/failed','src/Program.cs','NOT TESTED: отдельный HTTP terminal replay'],
 ['I10','Внешний эффект — отдельная гарантия','SOURCE: граница локальной транзакции; BROWSER-MODEL: неопределённость','TECHNICAL-JOURNEY.md','NOT TESTED: внешняя однократность']
];
for(const [id,title,proof,file,limit] of rows){
  const part=append(el('article',undefined,'rj-evidence-row'),el('h3',id+' · '+title),el('p',proof),...([file].flat().map(f=>append(el('p'),link(f,f)))),el('p',limit,'muted'));
  $('rj-matrix').append(part);
}
render();
