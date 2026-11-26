import type { HttpClient, HttpCallResult, HttpRequestDescriptor, HttpResponseMode } from "./generated-ts/runtime/httpClient";
import type { CustomerDto } from "./generated-ts/customers/types/CustomerDto.generated";

const fields = ["name","email","segment","note","id"] as const;
type Field = typeof fields[number];
const field=(value:string|null):Field=>{
  const key=fields.find(f=>f.toLowerCase()===value?.toLowerCase());
  if(!key) throw new Error("Unsupported demo field");
  return key;
};
const valueOf=(row:CustomerDto,key:Field)=>String(row[key]??"").toLowerCase();
const seed:CustomerDto[]=[
  {id:"00000000-0000-4000-8000-000000000001",name:"Alfa Service (sample)",email:"alpha@example.invalid",segment:"B2B",note:"Synthetic record"},
  {id:"00000000-0000-4000-8000-000000000002",name:"North Project (sample)",email:"north@example.invalid",segment:"SMB",note:"Synthetic record"},
  {id:"00000000-0000-4000-8000-000000000003",name:"Mayak (sample)",email:"mayak@example.invalid",segment:"B2B",note:null}
];
export function createPreviewClient():HttpClient {
  const records=new Map(seed.map(row=>[row.id,{...row}]));
  function parseBody(body:unknown){
    if(typeof body!=="string")throw new Error("Expected JSON body");
    const x=JSON.parse(body);
    const name=typeof x.name==="string"?x.name.trim():"";
    if(!name||name.length>180)throw new Error("Name is required (max 180)");
    function optional(key:string,max:number){
      if(x[key]===null||x[key]===undefined||x[key]==="")return null;
      if(typeof x[key]!=="string"||x[key].length>max)throw new Error("Invalid "+key);
      return x[key];
    }
    return {name,email:optional("email",180),note:optional("note",500),segment:optional("segment",90)};
  }
  return {async call<TJson, M extends HttpResponseMode>(request:HttpRequestDescriptor<M>):Promise<HttpCallResult<TJson,M>> {
    if(request.signal?.aborted)throw new DOMException("Aborted","AbortError");
    // No fetch and no network fallback: generated transport descriptors are
    // interpreted only against the fixed local customer routes.
    const url=new URL(request.url,"https://preview.invalid");
    if(url.origin!=="https://preview.invalid")throw new Error("External URL denied");
    const q=url.searchParams, path=url.pathname, method=request.method.toUpperCase();
    const rows=()=>[...records.values()].map(x=>({...x}));
    let data:unknown=null,status=200;
    if(path==="/api/customers"&&method==="GET"){
      let items=rows();
      for(let i=0;q.has("filters["+i+"].field");i++){
        const prefix="filters["+i+"].";
        const key=field(q.get(prefix+"field")),operator=q.get(prefix+"operator"),value=(q.get(prefix+"value")??"").toLowerCase();
        const values=[...q.entries()].filter(([k])=>k.startsWith(prefix+"values[")).map(([,v])=>v.toLowerCase());
        items=items.filter(row=>{const v=valueOf(row,key);switch(operator){case "contains":return v.includes(value);case "equals":return v===value;case "startsWith":return v.startsWith(value);case "in":return values.includes(v);default:throw new Error("Unsupported filter");}});
      }
      const sorts:{key:Field;dir:number}[]=[];
      for(let i=0;q.has("sort["+i+"].field");i++){
        const prefix="sort["+i+"].";sorts.push({key:field(q.get(prefix+"field")),dir:q.get(prefix+"direction")?.toLowerCase()==="desc"?-1:1});
      }
      if(sorts.length)items.sort((a,b)=>{for(const s of sorts){const c=valueOf(a,s.key).localeCompare(valueOf(b,s.key))*s.dir;if(c)return c;}return 0;});
      const page=Math.max(1,Number(q.get("page"))||1),pageSize=Math.min(100,Math.max(1,Number(q.get("pageSize"))||10));
      data={items:items.slice((page-1)*pageSize,page*pageSize),page,pageSize,totalCount:items.length};
    } else if(path.startsWith("/api/customers/suggest/")&&method==="GET"){
      const name=decodeURIComponent(path.split("/").pop()!);
      if(name==="__none")data=[];
      else{const key=field(name),term=(q.get("query")??"").toLowerCase();data=[...new Set(rows().map(r=>String(r[key]??"")).filter(v=>v&&v.toLowerCase().includes(term)))].slice(0,10).map(v=>({label:v,value:v}));}
    } else if(path==="/api/customers"&&method==="POST"){
      const row={id:crypto.randomUUID(),...parseBody(request.body)};records.set(row.id,row);data={...row};status=201;
    } else if(/^\/api\/customers\/[0-9a-f-]+$/i.test(path)){
      const id=path.split("/").pop()!,row=records.get(id);
      if(!row)throw new Error("Customer not found");
      if(method==="GET")data={...row};
      else if(method==="PUT"){const changed={id,...parseBody(request.body)};records.set(id,changed);data={...changed};}
      else if(method==="DELETE"){records.delete(id);status=204;}
      else throw new Error("Unsupported customer method");
    } else throw new Error("Unsupported preview endpoint");
    return {status,headers:new Headers(),responseMode:request.responseMode,data} as HttpCallResult<TJson,M>;
  }};
}
