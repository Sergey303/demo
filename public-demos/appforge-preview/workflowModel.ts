import type { CustomerDto } from "./generated-ts/customers/types/CustomerDto.generated";
import type { ServiceRequestDto } from "./generated-ts/servicerequests/types/ServiceRequestDto.generated";
import type { WorkItemDto } from "./generated-ts/workitems/types/WorkItemDto.generated";

export type { CustomerDto, ServiceRequestDto, WorkItemDto };
export const PEOPLE = ["Анна", "Илья", "Марина"] as const;
export const NEW = "Новая", ACTIVE = "В работе", DONE = "Выполнена";
export type Records = { customers: CustomerDto[]; servicerequests: ServiceRequestDto[]; workitems: WorkItemDto[] };
export const id = (n: number) => "00000000-0000-4000-8000-" + String(n).padStart(12, "0");
export function seed(): Records {
  return {
    customers: [
      {id:id(1),name:"Альфа Сервис",segment:"Обслуживание"},
      {id:id(2),name:"Север Проект",segment:"Монтаж"},
      {id:id(3),name:"Маяк",segment:"Производство"},
    ],
    servicerequests: [
      {id:id(11),customerId:id(1),title:"ТО оборудования",priority:"Обычный",description:"Плановое обслуживание оборудования"},
      {id:id(12),customerId:id(2),title:"Настройка контроллера",priority:"Высокий",description:"Согласовать параметры конфигурации"},
      {id:id(13),customerId:id(3),title:"Диагностика привода",priority:"Обычный",description:"Определить причину учебного сбоя"},
      {id:id(14),customerId:id(1),title:"Проверка насоса",priority:"Высокий",description:"Проверить работоспособность насоса"},
    ],
    workitems: [
      {id:id(21),serviceRequestId:id(11),title:"Осмотр",assignee:"Анна",status:DONE,note:"Осмотр завершён, замечаний нет"},
      {id:id(22),serviceRequestId:id(11),title:"Проверка запуска",assignee:"Илья",status:ACTIVE,note:"Проверка ещё не завершена"},
      {id:id(23),serviceRequestId:id(12),title:"Согласование конфигурации",assignee:null,status:NEW,note:null},
      {id:id(24),serviceRequestId:id(13),title:"Диагностика",assignee:"Марина",status:DONE,note:"Причина учебного сбоя определена"},
      {id:id(25),serviceRequestId:id(13),title:"Проверка результата",assignee:"Марина",status:DONE,note:"Учебная проверка завершена"},
    ]
  };
}
export const tasksOf=(s:Records,r:string)=>s.workitems.filter(t=>t.serviceRequestId===r);
export function requestStatus(s:Records,r:string) {
  const tasks=tasksOf(s,r);
  if(tasks.length && tasks.every(t=>t.status===DONE)) return "Работы выполнены";
  return tasks.some(t=>t.status===ACTIVE||t.status===DONE)?ACTIVE:NEW;
}
export function queues(s:Records) {
  const open=s.servicerequests.filter(r=>requestStatus(s,r.id)!=="Работы выполнены");
  const empty=s.servicerequests.filter(r=>!tasksOf(s,r.id).length);
  const unassigned=s.workitems.filter(t=>t.status!==DONE&&!t.assignee);
  const complete=s.servicerequests.filter(r=>requestStatus(s,r.id)==="Работы выполнены");
  return {open,empty,unassigned,complete};
}
export function text(value:unknown,max:number,required=false):string|null {
  if(value==null&&!required)return null;
  if(typeof value!=="string"||value.length>max||required&&!value.trim())throw new Error("Проверьте обязательное поле и длину текста");
  return value.trim()||null;
}
export function person(value:unknown) {
  if(value==null||value==="")return null;
  if(!PEOPLE.some(p=>p===value))throw new Error("Выберите исполнителя из списка");
  return String(value);
}
export function transition(old:WorkItemDto,next:WorkItemDto):WorkItemDto {
  if(old.serviceRequestId!==next.serviceRequestId)throw new Error("Нельзя изменить связанную заявку");
  const from=old.status,to=next.status, changed=old.assignee!==next.assignee;
  if(changed&&(from===DONE||from===ACTIVE&&!next.assignee))throw new Error("Недопустимое изменение исполнителя");
  if(from!==to){
    if(changed)throw new Error("Назначение и смена состояния выполняются отдельно");
    if(!next.assignee)throw new Error("Сначала назначьте исполнителя");
    if(from===NEW&&to===ACTIVE) { if(next.note!==old.note)throw new Error("Начало не меняет результат"); }
    else if(from===ACTIVE&&to===DONE) { text(next.note,700,true); }
    else if(from===DONE&&to===ACTIVE) {if(next.note!==old.note)throw new Error("При возврате результат сохраняется");}
    else throw new Error("Недопустимый переход состояния");
  }else if(from===DONE && (next.note!==old.note||next.title!==old.title))throw new Error("Сначала верните задачу в работу");
  if(to!==NEW&&!next.assignee)throw new Error("Нужен исполнитель");
  return next;
}
