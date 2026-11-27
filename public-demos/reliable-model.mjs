import {newJobs} from './model.mjs';
export const KEY='service-request-1042';
export const PAYLOAD='Заявка SR-1042 — Проверка насоса';
export const CHANGED='Заявка SR-1042 — Проверка контроллера';
// SHA-256 of the exact two fixed UTF-8 payloads, verified in node tests.
export const hashOf=text=>text===PAYLOAD?"9C81B573711AB29320415D617E196CE79C03CE69814E08B9CBF55895300100D2":text===CHANGED?"E656719BF937430031590F18146B95EA245CC790987A5E8C3E336D94DBA38CEC":null;
export const SCENARIOS={
  main:{title:'Потеря ответа после принятия',steps:['lost','repeat','process','get']},
  intake:{title:'Откат при приёме',steps:['intakeRollback','repeat','process','get']},
  conflict:{title:'Изменённое содержимое',steps:['send','conflict','repeat','process','get']},
  worker:{title:'Откат при обработке',steps:['send','workerRollback','process','get']},
  failures:{title:'Пять ошибок обработчика',steps:['send','failure','failure','failure','failure','failure','get']},
  external:{title:'Неизвестный внешний эффект',steps:['externalLost']}
};
export const LABELS={
  lost:'Отправить и потерять ответ',repeat:'Повторить с прежними данными',process:'Обработать ожидающие',
  get:'Проверить состояние по известному ID',send:'Отправить заявку',intakeRollback:'Откатить приём до commit',
  conflict:'Отправить изменённое содержимое',workerRollback:'Откатить обработку до commit',
  failure:'Смоделировать ошибку обработчика',externalLost:'Потерять ответ внешнего сервиса',
  replay:'Повторить POST с исходным ключом',terminalGet:'Проверить состояние GET',
  reprocess:'Проверить очередь повторно',newKey:'Отправить с новым ключом'
};
const sender=()=>({posts:0,knownId:null,observation:'Не отправлено',last:'—',key:KEY,input:PAYLOAD});
export function createReliable(scenario='main') {
  if(!Object.hasOwn(SCENARIOS,scenario))throw new Error('Unknown scenario');
  const lanes=[{name:'С защитой',store:newJobs(),client:sender(),events:[]},
    ...(scenario==='main'?[{name:'Без защиты',store:newJobs({protectedKeys:false}),client:sender(),events:[]}]:[])];
  let index=0,external=false,extra=false,extraChecked=false,terminalReplay=false,replayChecked=false,queueChecked=false;
  const log=(lane,phase,message)=>lane.events.push({n:lane.events.length+1,phase,message});
  function post(lane,key,text,mode='normal'){
    const c=lane.client;c.posts++;c.key=key;c.input=text;
    log(lane,'T1 / POST','POST /jobs; ключ '+key);
    const r=lane.store.submit(key,text,{rollback:mode==='rollback'});
    if(mode==='rollback'){
      c.observation='Подтверждение не получено';c.last='Нет подтверждения';c.knownId=null;
      log(lane,'T1 / rollback','Tentative job + outbox отброшены; committed 0/0');return;
    }
    if(mode==='lost'){
      c.observation='Подтверждение не получено';c.last='Ответ потерян';c.knownId=null;
      log(lane,'T1 / commit','Зафиксированы '+r.job.id+' и '+r.job.eventId+'; HTTP-ответ потерян');return;
    }
    if(r.status===409){c.observation='Конфликт';c.last='409 conflict';log(lane,'T1 / conflict','409; исходные ID и содержимое не изменены');return;}
    c.knownId=r.job.id;c.observation='Принята (результат ещё не проверен)';
    c.last=r.status+(r.status===200?' already-accepted':' accepted')+' · '+r.job.id;
    log(lane,'T1 / response',(r.status===202?'Commit job + outbox; ':'Без новых записей; ')+c.last);
  }
  function get(lane){
    const c=lane.client,j=lane.store.get(c.knownId);
    if(!j)return;
    c.last='GET /jobs/'+j.id+' → 200 · '+j.state;
    c.observation={queued:'Принята, ожидает обработки',done:'Выполнена — результат проверен',failed:'Ошибка — требует проверки'}[j.state];
    log(lane,'GET',c.last);
  }
  function process(lane,action){
    const ready=lane.store.list().filter(j=>j.state==='queued');
    if(!ready.length){log(lane,'T2','Нет доступной queued записи; результат не изменён');return;}
    for(const j of ready){
      if(action!=='rollback'&&j.nextAttemptAt>lane.store.clock())
        log(lane,'Virtual clock','Моделируем ожидание до '+j.nextAttemptAt+' с, без реального таймера');
      const r=lane.store.stepId(j.id,action);
      const msg=action==='rollback'?'Tentative result отброшен; queued, attempts и processed_at без изменений':
        action==='failure'?'Commit ошибки '+r.attempts+'; '+r.state+'; next_attempt_at='+r.nextAttemptAt:
        'Commit result + processed_at вместе; '+r.id+' done';
      log(lane,'T2 / '+(action==='rollback'?'rollback':'commit'),msg);
    }
  }
  function available(){
    const primary=SCENARIOS[scenario].steps[index]??null;
    const finished=!primary&&scenario!=='external'&&scenario!=='main'&&!extra;
    return {primary,replay:finished&&!terminalReplay,terminalGet:(finished&&terminalReplay&&!replayChecked)||(extra&&!extraChecked),
      reprocess:finished&&!queueChecked,newKey:finished&&(!terminalReplay||replayChecked)};
  }
  function action(id){
    const a=available();if(typeof id!=='string'||(id!==a.primary&&a[id]!==true))return false;
    if(id===a.primary)index++;
    if(id==='externalLost'){external=true;return true;}
    if(id==='newKey')extra=true;
    if(id==='replay')terminalReplay=true;
    if(id==='reprocess')queueChecked=true;
    if(id==='terminalGet'){if(extra)extraChecked=true;else replayChecked=true;}
    for(const lane of lanes){
      if(id==='lost')post(lane,KEY,PAYLOAD,'lost');
      else if(id==='intakeRollback')post(lane,KEY,PAYLOAD,'rollback');
      else if(['repeat','send','replay'].includes(id))post(lane,KEY,PAYLOAD);
      else if(id==='conflict')post(lane,KEY,CHANGED);
      else if(id==='newKey')post(lane,KEY+'-new',PAYLOAD);
      else if(['get','terminalGet'].includes(id))get(lane);
      else if(id==='workerRollback')process(lane,'rollback');
      else if(id==='failure')process(lane,'failure');
      else if(['process','reprocess'].includes(id))process(lane,'success');
    }
    return true;
  }
  return {action,available,snapshot:()=>({scenario,index,external,extra,extraChecked,available:available(),lanes:lanes.map(l=>({
    name:l.name,client:{...l.client},jobs:l.store.list(),clock:l.store.clock(),events:l.events.map(e=>({...e}))
  }))})};
}
