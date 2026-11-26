export function newJobs() {
  const jobs = new Map();
  let next = 1;
  return {
    submit(key, text) {
      if (!key.trim() || !text.trim()) return { status: 400 };
      const old = jobs.get(key);
      if (old) return old.text === text ? {status:200, job:{...old}} : {status:409};
      const job = {id: 'JOB-' + String(next++).padStart(3,'0'), text, state:'queued', attempts:0};
      jobs.set(key, job);
      return {status:202, job:{...job}};
    },
    step(key, action) {
      const job = jobs.get(key);
      if (!job || job.state !== 'queued') return null;
      if (action === 'rollback') return {...job};
      if (action === 'failure') {
        job.attempts++;
        if (job.attempts === 5) job.state = 'failed';
      } else if (action === 'success') {
        job.state = 'done';
        job.words = job.text.trim().split(/\s+/).length;
      }
      return {...job};
    },
    list: () => [...jobs.values()].map(j=>({...j}))
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
