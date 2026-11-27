// Shared text-job simulator. No network, persistence or real locks.
export function newJobs({protectedKeys=true}={}) {
  const jobs = new Map();
  let next = 1, clock = 0;
  const copy = j => j ? {...j} : null;
  const byKey = key => [...jobs.values()].find(j=>j.key===key);
  function stepId(id, action) {
    const job = jobs.get(id);
    if (!job || job.state !== 'queued' || !['rollback','failure','success'].includes(action)) return null;
    if (action === 'rollback') return copy(job);
    clock=Math.max(clock,job.nextAttemptAt);
    if (action === 'failure') {
      job.attempts++;
      job.lastError='DemoHandlerException';
      if (job.attempts === 5) {
        job.state='failed'; job.nextAttemptAt='max';
      } else job.nextAttemptAt=clock+2**(job.attempts-1);
    } else {
      job.state='done';job.words=job.text.trim().split(/\s+/).length;
      job.processedAt=clock;job.lastError=null;
    }
    return copy(job);
  }
  return {
    submit(key, text, {rollback=false}={}) {
      if (!key.trim() || !text.trim()) return {status:400};
      const old = protectedKeys ? byKey(key) : null;
      if (old) return old.text === text ? {status:200, job:copy(old)} : {status:409};
      if (rollback) return {status:null};
      const id='JOB-'+String(next).padStart(3,'0');
      const job={id,eventId:'EV-'+String(next++).padStart(3,'0'),key,text,state:'queued',
        attempts:0,nextAttemptAt:clock,processedAt:null,lastError:null};
      jobs.set(id,job);
      return {status:202,job:copy(job)};
    },
    step(key,action) {return stepId(byKey(key)?.id,action);},
    stepId,
    get:id=>copy(jobs.get(id)),
    list:()=>[...jobs.values()].map(copy),
    clock:()=>clock
  };
}
export function newAdmin() {
  const initial = [
    {id:1, name:'Альфа Сервис (пример)', email:'alpha@example.invalid', segment:'B2B'},
    {id:2, name:'Север Проект (пример)', email:'north@example.invalid', segment:'Малый бизнес'},
    {id:3, name:'Маяк (пример)', email:'mayak@example.invalid', segment:'B2B'}
  ];
  let rows=initial.map(x=>({...x})), next=4;
  return {
    list(q='') {return rows.filter(x=>!x.deleted && (x.name+' '+x.email).toLowerCase().includes(q.toLowerCase())).map(x=>({...x}));},
    save({id,name,email,segment}) {
      name=name.trim(); email=email.trim();
      if(!name || (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) || name.length > 180 || email.length > 180 || segment.length > 90) return false;
      if(id) {const x=rows.find(x=>x.id===id&&!x.deleted); if(!x)return false; Object.assign(x,{name,email,segment});}
      else rows.push({id:next++,name,email,segment});
      return true;
    },
    remove(id) {const x=rows.find(x=>x.id===id&&!x.deleted);if(!x)return false;x.deleted=true;return true;}
  };
}
export const evidence = [
  {id:'doc', title:'refund-policy.md', location:'символы 26–72 (см. протокол)', quote:'Customers can request a refund within 30 days.'},
  {id:'audio', title:'refund-audio.wav', location:'00:00–00:03 (см. протокол)', quote:'Customers can request a refund within thirty days.'}
];
export function replay({grants,scenario,mode}) {
  if(scenario==='unknown') return {answer:'В записи нет достаточных данных для ответа.',sources:[]};
  const sources=evidence.filter(s=>grants.includes(s.id));
  if(!sources.length)return {answer:'Нет разрешённых источников — ответ не формируется.',sources:[]};
  if(mode==='generated' && sources.length===2) return {answer:'Customers can request a refund within 30 days.',sources,recorded:true};
  return {answer:sources.map(s=>s.quote).join('\n'),sources,recorded:false};
}
