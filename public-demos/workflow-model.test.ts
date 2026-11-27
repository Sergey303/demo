import test from "node:test";
import assert from "node:assert/strict";
import {createWorkflowClient} from "./appforge-preview/workflowClient";
import {seed,queues,id,NEW,ACTIVE,DONE} from "./appforge-preview/workflowModel";

test("P1 synthetic queues match linked seed",()=>{
  const q=queues(seed());
  assert.deepEqual([q.open.length,q.empty.length,q.unassigned.length,q.complete.length],[3,1,1,1]);
});
test("P1 local transport rejects invalid transitions without mutation and replays creates",async()=>{
  const c=createWorkflowClient();
  const call=async(method:string,url:string,body?:unknown,key?:string)=>{
    const req={method,url,body:body===undefined?undefined:JSON.stringify(body),headers:key?{"Idempotency-Key":key}:undefined,responseMode:"json" as const};
    return (await c.call(req)).data as any;
  };
  const path="/api/workitems/"+id(23);
  let current=await call("GET",path);
  const reject=async(patch:object)=>{
    await assert.rejects(()=>call("PUT",path,{...current,...patch}));
    assert.deepEqual(await call("GET",path),current);
  };
  await reject({status:ACTIVE});
  await reject({assignee:"Неизвестный"});
  await reject({serviceRequestId:id(14)});
  current=await call("PUT",path,{...current,assignee:"Анна"});
  await reject({status:DONE,note:"Готово"});
  current=await call("PUT",path,{...current,status:ACTIVE});
  await reject({assignee:null});
  await reject({status:DONE,note:" "});
  current=await call("PUT",path,{...current,status:DONE,note:"Готово"});
  await reject({assignee:"Илья"});
  await reject({note:"Изменено"});
  await reject({status:ACTIVE,note:"Изменено"});
  current=await call("PUT",path,{...current,status:ACTIVE});
  assert.equal(current.note,"Готово");
  const body={serviceRequestId:id(14),title:"Учебная задача",status:NEW,assignee:null};
  const before=await call("GET","/api/workitems");
  await assert.rejects(()=>call("POST","/api/workitems",{...body,serviceRequestId:id(999)}));
  await assert.rejects(()=>call("POST","/api/workitems",{...body,title:" "}));
  const first=await call("POST","/api/workitems",body,"repeat");
  assert.deepEqual(await call("POST","/api/workitems",body,"repeat"),first);
  await assert.rejects(()=>call("POST","/api/workitems",{...body,title:"Другая"},"repeat"));
  assert.equal((await call("GET","/api/workitems")).totalCount,before.totalCount+1);
  await assert.rejects(()=>call("DELETE","/api/servicerequests/"+id(14)));
});
