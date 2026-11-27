import { useEffect, useRef, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { CustomerField } from "./generated-ts/customers/components/CustomerField.generated";
import { ServiceRequestField } from "./generated-ts/servicerequests/components/ServiceRequestField.generated";
import { WorkItemField } from "./generated-ts/workitems/components/WorkItemField.generated";
import { loadRecords, saveCustomer, createRequest, createTask, updateTask } from "./workflowApi";
import { NEW, ACTIVE, DONE, PEOPLE, queues, requestStatus, tasksOf, type Records, type CustomerDto, type WorkItemDto, type ServiceRequestDto } from "./workflowModel";

type Role="manager"|"dispatcher"|"executor";
type Screen={kind:"home"|"customers"|"requests"|"tasks";filter?:string}|{kind:"customer"|"request"|"task";id:string};
type Draft={kind:"customer";value:Omit<CustomerDto,"id">;id?:string;returnToRequest?:boolean}|{kind:"request";value:Omit<ServiceRequestDto,"id">}|{kind:"task";value:Omit<WorkItemDto,"id">}|{kind:"result";id:string;note:string};
const roleNames:Record<Role,string>={manager:"Руководитель",dispatcher:"Диспетчер",executor:"Исполнитель"};
const rank=(r:ServiceRequestDto)=>r.priority==="Высокий"?0:1;
const sorted=(items:ServiceRequestDto[])=>[...items].sort((a,b)=>rank(a)-rank(b));
const matches=(a:string,q:string)=>a.toLocaleLowerCase("ru").includes(q.toLocaleLowerCase("ru").trim());
const value=(v:unknown)=>String(v??"");
const unitLabel=(n:number,task:boolean)=>{const v=n%100, tail=n%10;return v>=11&&v<=14?(task?"задач":"заявок"):tail===1?(task?"задача":"заявка"):tail>=2&&tail<=4?(task?"задачи":"заявки"):(task?"задач":"заявок");};
const confirmDiscard=()=>window.confirm("Отменить несохранённые изменения?");
function Badge({status}:{status:string}){return <span className={"status "+(status===DONE||status==="Работы выполнены"?"done":status===ACTIVE?"active":"")}>{status}</span>;}
function Select({id,label,value,options,onChange,required=false}:{id:string;label:string;value:string;options:{value:string;label:string}[];onChange:(v:string)=>void;required?:boolean}){
  return <label className="field" htmlFor={id}>{label}<select id={id} required={required} value={value} onChange={e=>onChange(e.target.value)}>{options.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}</select></label>;
}
const peopleOptions=[{value:"",label:"Не назначен"},...PEOPLE.map(p=>({value:p,label:p}))];
function Section({title,children,action}:{title:string;children:ReactNode;action?:ReactNode}){return <section className="panel"><div className="panel-head"><h2>{title}</h2>{action}</div>{children}</section>;}

export function WorkflowApp(){
  const [db,setDb]=useState<Records|null>(null);
  const [role,setRole]=useState<Role>("manager");
  const [person,setPerson]=useState<string>("Илья");
  const [screen,setScreen]=useState<Screen>({kind:"home"});
  const [query,setQuery]=useState("");
  const [draft,setDraft]=useState<Draft|null>(null);
  const [requestDraft,setRequestDraft]=useState<Draft|null>(null);
  const [assignment,setAssignment]=useState<string>("");
  const [error,setError]=useState("");
  const [message,setMessage]=useState("");
  const [busy,setBusy]=useState(false);
  const lock=useRef(false);
  const allowReload=useRef(false);
  const formRef=useRef<HTMLFormElement>(null);
  useEffect(()=>{let current=true;loadRecords().then(s=>{if(current)setDb(s);}).catch(()=>{if(current)setError("Не удалось загрузить учебные записи");});return()=>{current=false;};},[]);
  useEffect(()=>{if(!draft)return;const warn=(e:BeforeUnloadEvent)=>{if(!allowReload.current)e.preventDefault();};window.addEventListener("beforeunload",warn);return()=>window.removeEventListener("beforeunload",warn);},[draft]);
  useEffect(()=>{if(draft?.kind){formRef.current?.scrollIntoView({block:"center"});formRef.current?.querySelector<HTMLElement>("input,select,textarea")?.focus();}},[draft?.kind]);
  function navigate(next:Screen,nextRole?:Role){
    const task=screen.kind==="task"?db?.workitems.find(t=>t.id===screen.id):undefined;
    const assignmentDirty=role!=="executor"&&task&&assignment!==(task.assignee??"")&&task.status!==DONE;
    if(lock.current||(draft||assignmentDirty)&&!confirmDiscard())return false;setDraft(null);setRequestDraft(null);setScreen(next);setQuery("");setError("");setMessage("");if(nextRole)setRole(nextRole);return true;}
  function openTask(t:WorkItemDto){if(navigate({kind:"task",id:t.id}))setAssignment(t.assignee??"");}
  function changeRole(next:Role){navigate({kind:"home"},next);}
  async function mutate<T extends CustomerDto|ServiceRequestDto|WorkItemDto>(fn:()=>Promise<T>,after:(result:T)=>void,success:string){
    if(lock.current)return;
    lock.current=true;setBusy(true);setError("");setMessage("");
    try{
      const result=await fn();
      // A confirmed write is authoritative. Update only its projection instead
      // of coupling success to a second, potentially failing read.
      setDb(previous=>{
        if(!previous)return previous;
        const upsert=<R extends {id:string},>(rows:R[],row:R)=>rows.some(x=>x.id===row.id)?rows.map(x=>x.id===row.id?row:x):[...rows,row];
        if("serviceRequestId" in result)return {...previous,workitems:upsert(previous.workitems,result)};
        if("customerId" in result)return {...previous,servicerequests:upsert(previous.servicerequests,result)};
        return {...previous,customers:upsert(previous.customers,result)};
      });
      after(result);setMessage(success);
    }
    catch(e){setError(e instanceof Error?e.message:"Не удалось сохранить запись");}
    finally{lock.current=false;setBusy(false);}
  }
  function showDraft(next:Draft){if(lock.current||draft&&!confirmDiscard())return;setError("");setMessage("");setDraft(next);}
  function cancel(){if(lock.current)return;if(draft?.kind==="customer"&&draft.returnToRequest&&requestDraft){setDraft(requestDraft);setRequestDraft(null);}else setDraft(null);setError("");}
  function newRequest(customerId=""){showDraft({kind:"request",value:{customerId,title:"",priority:"Обычный",description:""}});}
  function newTask(id:string){if(db&&requestStatus(db,id)==="Работы выполнены"&&!window.confirm("Все работы уже выполнены. Новая задача снова откроет заявку. Продолжить?"))return;showDraft({kind:"task",value:{serviceRequestId:id,title:"",assignee:null,status:NEW,note:null}});}
  function submit(e:FormEvent){e.preventDefault();if(!draft||!db||lock.current)return;
    const invalid=(field:string,text:string)=>{setError(text);document.getElementById(field)?.focus();};
    if(draft.kind==="customer"){
      if(!draft.value.name.trim())return invalid("client-name","Введите название клиента");
      void mutate(()=>saveCustomer(draft.value,draft.id),c=>{
        if(draft.returnToRequest&&requestDraft?.kind==="request"){setDraft({...requestDraft,value:{...requestDraft.value,customerId:c.id}});setRequestDraft(null);}
        else{setDraft(null);setScreen({kind:"customer",id:c.id});}
      },"Карточка клиента сохранена");
    }else if(draft.kind==="request"){
      if(!draft.value.customerId)return invalid("request-customer","Выберите клиента");
      if(!draft.value.title.trim())return invalid("request-title","Введите название заявки");
      void mutate(()=>createRequest(draft.value),r=>{setDraft(null);setScreen({kind:"request",id:r.id});},"Заявка создана");
    }else if(draft.kind==="task"){
      if(!draft.value.title.trim())return invalid("task-title","Введите название задачи");
      void mutate(()=>createTask(draft.value),()=>setDraft(null),"Задача добавлена");
    }else{
      if(!draft.note.trim())return invalid("task-result","Укажите результат работы");
      const task=db.workitems.find(t=>t.id===draft.id);if(!task)return;
      void mutate(()=>updateTask(task,{status:DONE,note:draft.note}),()=>setDraft(null),"Работа выполнена");
    }
  }
  if(!db)return <main className="layout"><p role="status">{error||"Загрузка учебных записей…"}</p>{error&&<button onClick={()=>window.location.reload()}>Повторить загрузку</button>}</main>;
  const q=queues(db);
  const customer=(id:string)=>db.customers.find(c=>c.id===id)!;
  const request=(id:string)=>db.servicerequests.find(r=>r.id===id)!;
  const taskList=(tasks:WorkItemDto[])=>[...tasks].sort((a,b)=>rank(request(a.serviceRequestId))-rank(request(b.serviceRequestId))||Number(b.status===ACTIVE)-Number(a.status===ACTIVE));
  const matchingRequests=(items:ServiceRequestDto[])=>sorted(items).filter(r=>matches(r.title+" "+customer(r.customerId).name,query));
  const matchingTasks=(items:WorkItemDto[])=>taskList(items).filter(t=>matches(t.title+" "+request(t.serviceRequestId).title+" "+customer(request(t.serviceRequestId).customerId).name+" "+value(t.assignee),query));
  const showRequest=(r:ServiceRequestDto)=>navigate({kind:"request",id:r.id});
  const showCustomer=(c:CustomerDto)=>navigate({kind:"customer",id:c.id});
  function requestRows(items:ServiceRequestDto[],action="Открыть заявку"){
    const list=matchingRequests(items);
    return list.length?<div className="rows">{list.map(r=><article key={r.id} className="record" aria-label={r.title}><div><span className="eyebrow">{customer(r.customerId).name} · {r.priority} приоритет</span><h3>{r.title}</h3><Badge status={requestStatus(db!,r.id)}/><span className="sub"> · {tasksOf(db!,r.id).length} {unitLabel(tasksOf(db!,r.id).length,true)}</span></div><button className="secondary" onClick={()=>showRequest(r)}>{action}</button></article>)}</div>:<p className="empty">Нет заявок по этому фильтру</p>;
  }
  function taskRows(items:WorkItemDto[],empty="Нет задач по этому фильтру",action="Открыть задачу"){
    const list=matchingTasks(items);
    return list.length?<div className="rows">{list.map(t=><article key={t.id} className="record" aria-label={t.title}><div><span className="eyebrow">{customer(request(t.serviceRequestId).customerId).name} · {request(t.serviceRequestId).title} · {request(t.serviceRequestId).priority} приоритет</span><h3>{t.title}</h3><Badge status={t.status??NEW}/><span className="sub"> · {t.assignee||"Не назначен"}</span>{t.note&&<p className="result">{t.note}</p>}</div><button className="secondary" onClick={()=>openTask(t)}>{action}</button></article>)}</div>:<p className="empty">{query.trim()&&items.length?"По вашему запросу ничего не найдено":empty}</p>;
  }
  function summary(){
    const cards=[["open","Незавершённые заявки",q.open.length,"заявок"],["empty","Заявки без задач",q.empty.length,"заявок"],["unassigned","Задачи без исполнителя",q.unassigned.length,"задач"],["complete","Все работы выполнены",q.complete.length,"заявок"]] as const;
    return <div className="metrics">{cards.map(([key,label,n,unit])=><button key={key} className="metric" data-testid={"metric-"+key} onClick={()=>navigate({kind:key==="unassigned"?"tasks":"requests",filter:key})}><span>{label}</span><strong>{n} <small>{unitLabel(n,unit==="задач")}</small></strong><span className="metric-link">Посмотреть →</span></button>)}</div>;
  }
  const clientScreen=screen.kind==="customer"?customer(screen.id):null;
  const requestScreen=screen.kind==="request"?request(screen.id):null;
  const taskScreen=screen.kind==="task"?db.workitems.find(t=>t.id===screen.id):null;
  return <><header className="top"><div className="top-inner"><a href="../" className="brand"><span className="brand-mark">КЗ</span><span>Клиенты, заявки и задачи<small>Учебная сервисная компания</small></span></a><button className="secondary" disabled={busy} onClick={()=>{if(window.confirm("Восстановить исходные учебные данные?")){allowReload.current=true;window.location.reload();}}}>Сбросить демо</button></div></header>
    <main className="layout">
      <div className="notice">Демо без регистрации и сервера. Переключение рабочих мест не является разграничением прав. Изменения хранятся в памяти вкладки; обновление страницы их сбрасывает. Не вводите реальные данные.</div>
      <div className="workspace-tabs" role="group" aria-label="Рабочее место">{(Object.keys(roleNames) as Role[]).map(r=><button key={r} aria-pressed={role===r} onClick={()=>changeRole(r)}>{roleNames[r]}</button>)}</div>
      <nav className="nav" aria-label="Разделы"><button onClick={()=>navigate({kind:"home"})}>Главная</button>{role!=="executor"&&<><button onClick={()=>navigate({kind:"customers"})}>Клиенты</button><button onClick={()=>navigate({kind:"requests"})}>Заявки</button></>}<button onClick={()=>navigate({kind:"tasks",filter:role==="executor"?"mine":"all"})}>{role==="executor"?"Мои задачи":"Задачи"}</button></nav>
      {role==="executor"&&<Select id="profile" label="Учебный исполнитель" value={person} options={peopleOptions.slice(1)} onChange={v=>{if(navigate({kind:"home"}))setPerson(v);}}/>}
      {message&&<p className="feedback" role="status">{message}</p>}{error&&<p className="error" role="alert">{error}</p>}
      {screen.kind==="home"&&role==="manager"&&<><div className="heading"><div><p className="eyebrow">Рабочее место руководителя</p><h1>Что требует внимания</h1><p>Откройте очередь, чтобы распределить работу или проверить результат.</p></div></div>{summary()}<div className="columns"><Section title="Задачи без исполнителя">{taskRows(q.unassigned,"Все открытые задачи назначены","Назначить")}</Section><Section title="Заявки без задач">{requestRows(q.empty,"Организовать работу")}</Section></div><Section title="Открытые поручения по исполнителям"><div className="load">{PEOPLE.map(p=><button key={p} onClick={()=>{if(navigate({kind:"tasks",filter:"mine"},"executor"))setPerson(p);}}>{p}<strong>{db.workitems.filter(t=>t.assignee===p&&t.status!==DONE).length}</strong></button>)}<span className="sub">Без исполнителя: {q.unassigned.length}</span></div></Section></>}
      {screen.kind==="home"&&role==="dispatcher"&&<><div className="heading"><div><p className="eyebrow">Рабочее место диспетчера</p><h1>Приём и распределение заявок</h1><p>Найдите клиента, зарегистрируйте обращение и назначьте работу.</p></div><button onClick={()=>newRequest()}>Новая заявка</button></div><label className="field">Поиск по клиенту и заявке<input type="search" value={query} onChange={e=>setQuery(e.target.value)}/></label>{query.trim()?<><Section title="Клиенты">{db.customers.filter(c=>matches(c.name,query)).map(c=><article className="record" key={c.id}><h3>{c.name}</h3><button className="secondary" onClick={()=>showCustomer(c)}>Открыть клиента</button></article>)}{!db.customers.some(c=>matches(c.name,query))&&<p className="empty">Клиенты не найдены</p>}</Section><Section title="Найденные заявки">{requestRows(db.servicerequests)}</Section></>:<div className="columns"><Section title="Заявки без задач">{requestRows(q.empty,"Добавить задачу")}</Section><Section title="Задачи без исполнителя">{taskRows(q.unassigned,"Все открытые задачи назначены","Назначить")}</Section></div>}</>}
      {screen.kind==="home"&&role==="executor"&&<><div className="heading"><div><p className="eyebrow">Рабочее место исполнителя</p><h1>Мои открытые задачи</h1><p>Откройте поручение, начните работу и зафиксируйте результат.</p></div></div><Section title="Открытые поручения">{taskRows(db.workitems.filter(t=>t.assignee===person&&t.status!==DONE),"У выбранного исполнителя нет открытых поручений")}</Section><Section title="Выполненные задачи">{taskRows(db.workitems.filter(t=>t.assignee===person&&t.status===DONE))}</Section></>}
      {screen.kind==="customers"&&<><div className="heading"><h1>Клиенты</h1><button onClick={()=>showDraft({kind:"customer",value:{name:"",email:"",segment:"",note:""}})}>Новый клиент</button></div><label className="field">Поиск клиента<input type="search" value={query} onChange={e=>setQuery(e.target.value)}/></label><Section title="Реестр клиентов">{db.customers.filter(c=>matches(c.name,query)).map(c=><article className="record" key={c.id}><div><h3>{c.name}</h3><p>{c.segment||"Без сегмента"}</p></div><button className="secondary" onClick={()=>showCustomer(c)}>Открыть клиента</button></article>)}{!db.customers.some(c=>matches(c.name,query))&&<p className="empty">Клиенты не найдены</p>}</Section></>}
      {screen.kind==="requests"&&<><div className="heading"><h1>Заявки</h1><button onClick={()=>newRequest()}>Новая заявка</button></div><label className="field">Поиск по клиенту и заявке<input type="search" value={query} onChange={e=>setQuery(e.target.value)}/></label><Select id="request-filter" label="Фильтр заявок" value={screen.filter||"all"} options={[{value:"all",label:"Все заявки"},{value:"open",label:"Незавершённые"},{value:"empty",label:"Без задач"},{value:"complete",label:"Работы выполнены"}]} onChange={v=>setScreen({kind:"requests",filter:v})}/><Section title="Список заявок">{requestRows(screen.filter==="open"?q.open:screen.filter==="empty"?q.empty:screen.filter==="complete"?q.complete:db.servicerequests)}</Section></>}
      {screen.kind==="tasks"&&<><h1>{screen.filter==="mine"?"Мои задачи":"Задачи"}</h1><label className="field">Поиск задачи<input type="search" value={query} onChange={e=>setQuery(e.target.value)}/></label>{role!=="executor"&&<Select id="task-filter" label="Фильтр задач" value={screen.filter||"all"} options={[{value:"all",label:"Все задачи"},{value:"unassigned",label:"Без исполнителя"}]} onChange={v=>setScreen({kind:"tasks",filter:v})}/>}<Section title="Рабочий список">{taskRows(screen.filter==="unassigned"?q.unassigned:screen.filter==="mine"?db.workitems.filter(t=>t.assignee===person&&t.status!==DONE):db.workitems,screen.filter==="unassigned"?"Все открытые задачи назначены":screen.filter==="mine"?"У выбранного исполнителя нет открытых поручений":undefined)}</Section></>}
      {clientScreen&&<><div className="heading"><div><p className="eyebrow">Карточка клиента</p><h1>{clientScreen.name}</h1><p>{clientScreen.segment||"Без сегмента"} · {clientScreen.email||"Email не указан"}</p>{clientScreen.note&&<p>{clientScreen.note}</p>}</div>{role!=="executor"&&<div className="actions"><button className="secondary" onClick={()=>{const {id,...value}=clientScreen;showDraft({kind:"customer",id,value});}}>Изменить клиента</button><button onClick={()=>newRequest(clientScreen.id)}>Новая заявка</button></div>}</div><Section title="История заявок">{sorted(db.servicerequests.filter(r=>r.customerId===clientScreen.id)).map(r=><article className="history" key={r.id}><button className="text-button" onClick={()=>showRequest(r)}>{r.title} →</button><Badge status={requestStatus(db,r.id)}/>{tasksOf(db,r.id).filter(t=>t.note).map(t=><p key={t.id}>{t.title}: {t.note}</p>)}</article>)}</Section></>}
      {requestScreen&&<><div className="heading"><div><button className="text-button" onClick={()=>showCustomer(customer(requestScreen.customerId))}>← {customer(requestScreen.customerId).name}</button><h1>{requestScreen.title}</h1><p>{requestScreen.description||"Описание не указано"} · {requestScreen.priority} приоритет</p><Badge status={requestStatus(db,requestScreen.id)}/></div>{role!=="executor"&&<button onClick={()=>newTask(requestScreen.id)}>Добавить задачу</button>}</div><Section title="Связанные задачи">{taskRows(tasksOf(db,requestScreen.id),"У заявки пока нет задач")}</Section></>}
      {taskScreen&&<><div className="heading"><div><button className="text-button" onClick={()=>showRequest(request(taskScreen.serviceRequestId))}>← {request(taskScreen.serviceRequestId).title}</button><h1>{taskScreen.title}</h1><p>{customer(request(taskScreen.serviceRequestId).customerId).name} · {request(taskScreen.serviceRequestId).priority} приоритет</p><Badge status={taskScreen.status??NEW}/><p>{taskScreen.assignee||"Исполнитель не назначен"}</p></div></div><Section title="Контекст и результат"><details><summary>Описание заявки</summary><p>{request(taskScreen.serviceRequestId).description||"Описание не указано"}</p></details><p>{taskScreen.note||"Результат пока не зафиксирован"}</p></Section>
        {role!=="executor"&&taskScreen.status!==DONE&&<Section title="Назначение исполнителя"><Select id="assignment" label="Исполнитель" value={assignment} options={taskScreen.status===ACTIVE?peopleOptions.slice(1):peopleOptions} onChange={setAssignment}/><button disabled={busy||assignment===(taskScreen.assignee??"")} onClick={()=>void mutate(()=>updateTask(taskScreen,{assignee:assignment||null}),()=>{},"Назначение сохранено")}>Сохранить назначение</button></Section>}
        {role==="executor"&&taskScreen.assignee===person&&<Section title="Действие по задаче">{taskScreen.status===NEW?<button disabled={busy} onClick={()=>void mutate(()=>updateTask(taskScreen,{status:ACTIVE}),()=>{},"Работа начата")}>Начать работу</button>:taskScreen.status===ACTIVE?<button onClick={()=>showDraft({kind:"result",id:taskScreen.id,note:taskScreen.note??""})}>Завершить с результатом</button>:<button className="secondary" onClick={()=>{if(window.confirm("Вернуть задачу в работу, сохранив результат?"))void mutate(()=>updateTask(taskScreen,{status:ACTIVE}),()=>{},"Задача возвращена в работу");}}>Вернуть в работу</button>}{taskScreen.status===DONE&&<button className="secondary" onClick={()=>navigate({kind:"home"})}>К следующим поручениям</button>}</Section>}
      </>}
      {draft&&<section className="panel editor" aria-label="Форма"><form ref={formRef} aria-label="Редактор записи" onSubmit={submit} noValidate><h2>{draft.kind==="customer"?(draft.id?"Изменить клиента":"Новый клиент"):draft.kind==="request"?"Новая заявка":draft.kind==="task"?"Новая задача":"Результат работы"}</h2>
        {draft.kind==="customer"&&<><CustomerField id="client-name" label="Название клиента" kind="text" required value={draft.value.name} onChange={v=>setDraft({...draft,value:{...draft.value,name:value(v)}})}/><CustomerField id="client-segment" label="Сегмент" kind="text" value={draft.value.segment} onChange={v=>setDraft({...draft,value:{...draft.value,segment:value(v)}})}/><CustomerField id="client-email" label="Email (необязательно)" kind="text" value={draft.value.email} onChange={v=>setDraft({...draft,value:{...draft.value,email:value(v)}})}/></>}
        {draft.kind==="request"&&<><Select id="request-customer" label="Клиент" required value={draft.value.customerId} options={[{value:"",label:"Выберите клиента"},...db.customers.map(c=>({value:c.id,label:c.name+(c.segment?" · "+c.segment:"")+" · "+c.id.slice(-4)}))]} onChange={v=>setDraft({...draft,value:{...draft.value,customerId:v}})}/><button type="button" className="text-button" onClick={()=>{setRequestDraft(draft);setDraft({kind:"customer",value:{name:"",segment:"",email:""},returnToRequest:true});}}>Нет клиента? Создать карточку</button>{draft.value.customerId&&<p className="sub">Открытые заявки клиента: {q.open.filter(r=>r.customerId===draft.value.customerId).map(r=>r.title).join(", ")||"нет"}</p>}<ServiceRequestField id="request-title" label="Название заявки" kind="text" required value={draft.value.title} onChange={v=>setDraft({...draft,value:{...draft.value,title:value(v)}})}/><Select id="request-priority" label="Приоритет" value={draft.value.priority??"Обычный"} options={["Обычный","Высокий"].map(v=>({value:v,label:v}))} onChange={v=>setDraft({...draft,value:{...draft.value,priority:v}})}/><label className="field">Описание<textarea value={draft.value.description??""} maxLength={1000} onChange={e=>setDraft({...draft,value:{...draft.value,description:e.target.value}})}/></label></>}
        {draft.kind==="task"&&<><WorkItemField id="task-title" label="Название задачи" kind="text" required value={draft.value.title} onChange={v=>setDraft({...draft,value:{...draft.value,title:value(v)}})}/><Select id="task-person" label="Исполнитель" value={draft.value.assignee??""} options={peopleOptions} onChange={v=>setDraft({...draft,value:{...draft.value,assignee:v||null}})}/></>}
        {draft.kind==="result"&&<label className="field" htmlFor="task-result">Результат работы<textarea id="task-result" maxLength={700} required value={draft.note} onChange={e=>setDraft({...draft,note:e.target.value})}/></label>}
        {error&&<p className="error">{error}</p>}<div className="actions"><button type="submit" disabled={busy}>{draft.kind==="request"?"Сохранить заявку":draft.kind==="task"?"Сохранить задачу":draft.kind==="result"?"Подтвердить выполнение":"Сохранить клиента"}</button><button type="button" className="secondary" disabled={busy} onClick={cancel}>Отмена</button></div></form></section>}
      <footer className="commercial"><div><h2>Как выглядела бы система вашей компании?</h2><p>Обсудим, какие операции сотрудники выполняют вручную и какой первый экран поможет их упростить.</p></div><a href="../../../?service=development#contact">Обсудить вашу внутреннюю систему →</a></footer>
    </main></>;
}
