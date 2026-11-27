import { previewId } from "./previewId";
import type { HttpClient, HttpCallResult, HttpRequestDescriptor, HttpResponseMode } from "./generated-ts/runtime/httpClient";
import { seed, text, person, transition, NEW, type Records, type CustomerDto, type ServiceRequestDto, type WorkItemDto } from "./workflowModel";

type Resource=keyof Records;
type Row=CustomerDto|ServiceRequestDto|WorkItemDto;
const allowed:Record<Resource,readonly string[]>={customers:["id","name","email","segment","note"],servicerequests:["id","customerId","title","priority","description"],workitems:["id","serviceRequestId","title","assignee","status","note"]};
export function createWorkflowClient():HttpClient {
  const db=seed();
  const replay=new Map<string,{body:string;data:Row}>();
  return {async call<T,M extends HttpResponseMode>(req:HttpRequestDescriptor<M>):Promise<HttpCallResult<T,M>> {
    if(req.signal?.aborted)throw new DOMException("Aborted","AbortError");
    const url=new URL(req.url,"https://workflow.invalid");
    const [,api,key,recordId,sub]=url.pathname.split("/");
    if(url.origin!=="https://workflow.invalid"||api!=="api"||!(key in allowed)||sub)throw new Error("Недоступный запрос демо");
    const resource=key as Resource, rows=db[resource] as Row[];
    let data:unknown=null,status=200;
    if(req.method==="GET"){
      if(recordId==="lookup")data=rows.map(r=>({value:r.id,label:"name" in r?r.name:r.title}));
      else if(recordId){data=rows.find(r=>r.id===recordId);if(!data)throw new Error("Запись не найдена");}
      else{
        const q=url.searchParams;
        const items=rows.filter(row=>{
          for(let i=0;q.has("filters["+i+"].field");i++){
            const p="filters["+i+"].", field=q.get(p+"field")||"", operator=q.get(p+"operator"), expected=q.get(p+"value")||"";
            if(!allowed[resource].includes(field))throw new Error("Недопустимый фильтр");
            const value=String(Reflect.get(row,field)??"").toLowerCase();
            if(operator==="equals"?value!==expected.toLowerCase():operator==="contains"?!value.includes(expected.toLowerCase()):true)return false;
          }
          return true;
        });
        const page=Math.max(1,Number(q.get("page"))||1),pageSize=Math.min(100,Math.max(1,Number(q.get("pageSize"))||100));
        data={items:items.slice((page-1)*pageSize,page*pageSize),page,pageSize,totalCount:items.length};
      }
    }else if(req.method==="POST"||req.method==="PUT"){
      if(typeof req.body!=="string")throw new Error("Некорректная запись");
      const raw=JSON.parse(req.body);
      const isNew=req.method==="POST";
      const previous=isNew?undefined:rows.find(r=>r.id===recordId);
      if(!isNew&&!previous||isNew&&recordId)throw new Error("Запись не найдена");
      const idem=new Headers(req.headers).get("Idempotency-Key");
      const replayKey=resource+":"+req.method+":"+String(recordId)+":"+idem;
      const prior=idem?replay.get(replayKey):undefined;
      if(prior){if(prior.body!==req.body)throw new Error("Конфликт повторного запроса");data=prior.data;status=isNew?201:200;}
      else {
        const id=previous?.id??previewId();
        let next:Row;
        if(resource==="customers")next={id,name:text(raw.name,180,true)!,email:text(raw.email,180),segment:text(raw.segment,90),note:text(raw.note,500)};
        else if(resource==="servicerequests"){
          if(!db.customers.some(c=>c.id===raw.customerId))throw new Error("Выберите существующего клиента");
          if(raw.priority!=="Высокий"&&raw.priority!=="Обычный")throw new Error("Выберите приоритет");
          next={id,customerId:raw.customerId,title:text(raw.title,200,true)!,priority:raw.priority,description:text(raw.description,1000)};
        }else{
          if(!db.servicerequests.some(r=>r.id===raw.serviceRequestId))throw new Error("Заявка не найдена");
          const task:WorkItemDto={id,serviceRequestId:raw.serviceRequestId,title:text(raw.title,200,true)!,assignee:person(raw.assignee),status:raw.status,note:text(raw.note,700)};
          if(isNew){if(task.status!==NEW||task.note)throw new Error("Новая задача должна начинаться со статуса «Новая»");next=task;}
          else next=transition(previous as WorkItemDto,task);
        }
        if(isNew)rows.push(next);else rows[rows.findIndex(r=>r.id===id)]=next;
        data=next;status=isNew?201:200;
        if(idem)replay.set(replayKey,{body:req.body,data:next});
      }
    }else throw new Error("Операция не предусмотрена в учебном процессе");
    return {data:structuredClone(data),status,headers:new Headers(),responseMode:req.responseMode} as HttpCallResult<T,M>;
  }};
}
