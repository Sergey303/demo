import type { Animal, Owner, Appointment, SearchReason } from "./types";

const norm=(value:string)=>value.trim().toLocaleLowerCase("ru-RU").replace(/ё/g,"е");
const digits=(value:string)=>value.replace(/\D/g,"");
export const filledSoapFields=(a:Appointment)=>[a.complaint,a.soapObjective,a.soapAssessment,a.soapPlan].filter(v=>v.trim()).length;
export type DemoSearchResult={animal:Animal;owner:Owner;reason:SearchReason|null;visits:Appointment[];current?:Appointment;example?:Appointment};
export function searchDemoAnimals(animals:Animal[],owners:Owner[],appointments:Appointment[],query:string,clinicId:string):DemoSearchResult[] {
  const normalized=norm(query);
  const phoneQuery=/^[+\d\s().-]+$/.test(normalized)?digits(normalized):"";
  const results:DemoSearchResult[]=[];
  for(const animal of animals){
    const owner=owners.find(o=>o.id===animal.ownerId);
    if(!owner)continue;
    let reason:SearchReason|null=null;
    if(normalized){
      if(phoneQuery&&digits(owner.phone).includes(phoneQuery))reason="phone_match";
      else if(norm(animal.chip).includes(normalized))reason="chip_match";
      else if(norm(animal.name).includes(normalized))reason="animal_name_match";
      else if(norm(owner.fullName).includes(normalized))reason="owner_name_match";
      else continue;
    }
    const visits=appointments.filter(a=>a.animalId===animal.id&&a.clinicId===clinicId)
      .sort((a,b)=>(Date.parse(b.startedAt)||0)-(Date.parse(a.startedAt)||0)||b.id.localeCompare(a.id));
    const current=visits.find(a=>["draft","in_progress"].includes(a.status));
    const example=visits.filter(a=>["completed_internal","completed_with_external_success"].includes(a.status)&&filledSoapFields(a)>0)
      .sort((a,b)=>filledSoapFields(b)-filledSoapFields(a))[0];
    results.push({animal,owner,reason,visits,current,example});
  }
  return results.sort((a,b)=>(b.example?filledSoapFields(b.example):0)-(a.example?filledSoapFields(a.example):0)||b.visits.length-a.visits.length||a.animal.name.localeCompare(b.animal.name,"ru"));
}
