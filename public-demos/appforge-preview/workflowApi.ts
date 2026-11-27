import { customerControllerListTransport } from "./generated-ts/operations/customerControllerListTransport.transport.generated";
import { serviceRequestControllerListTransport } from "./generated-ts/operations/serviceRequestControllerListTransport.transport.generated";
import { workItemControllerListTransport } from "./generated-ts/operations/workItemControllerListTransport.transport.generated";
import { customerControllerCreateTransport } from "./generated-ts/operations/customerControllerCreateTransport.transport.generated";
import { customerControllerUpdateTransport } from "./generated-ts/operations/customerControllerUpdateTransport.transport.generated";
import { serviceRequestControllerCreateTransport } from "./generated-ts/operations/serviceRequestControllerCreateTransport.transport.generated";
import { workItemControllerCreateTransport } from "./generated-ts/operations/workItemControllerCreateTransport.transport.generated";
import { workItemControllerUpdateTransport } from "./generated-ts/operations/workItemControllerUpdateTransport.transport.generated";
import type { Records, CustomerDto, ServiceRequestDto, WorkItemDto } from "./workflowModel";
import { previewId } from "./previewId";
const request=(page:number)=>({page,pageSize:100,filters:[],sort:[]});
async function all<T>(fetch:(p:number)=>Promise<{items:T[];totalCount:number}>){
  const first=await fetch(1), rows=[...first.items];
  for(let p=2;rows.length<first.totalCount;p++){
    const next=await fetch(p);if(!next.items.length)throw new Error("Неполная выборка");rows.push(...next.items);
  }
  return rows;
}
export async function loadRecords():Promise<Records>{
  const [customers,servicerequests,workitems]=await Promise.all([
    all(p=>customerControllerListTransport({request:request(p)})),
    all(p=>serviceRequestControllerListTransport({request:request(p)})),
    all(p=>workItemControllerListTransport({request:request(p)}))
  ]);
  return {customers,servicerequests,workitems};
}
const options=()=>({headers:{"Idempotency-Key":previewId()}});
export const saveCustomer=(body:Omit<CustomerDto,"id">,id?:string)=>id?customerControllerUpdateTransport({id,body},options()):customerControllerCreateTransport(body,options());
export const createRequest=(body:Omit<ServiceRequestDto,"id">)=>serviceRequestControllerCreateTransport(body,options());
export const createTask=(body:Omit<WorkItemDto,"id">)=>workItemControllerCreateTransport(body,options());
export const updateTask=(task:WorkItemDto,patch:Partial<Omit<WorkItemDto,"id">>)=>{
  const {id,...body}=task;return workItemControllerUpdateTransport({id,body:{...body,...patch}},options());
};
