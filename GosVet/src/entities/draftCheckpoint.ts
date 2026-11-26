import type { Appointment, AppointmentAction, ExternalSubmission } from "./types";
const entries=(value:Record<string,string>|undefined)=>Object.entries(value??{}).sort(([a],[b])=>a.localeCompare(b));
export function draftSignature(a:Appointment, actions:AppointmentAction[]) {
  return JSON.stringify([a.complaint,a.soapObjective,a.soapAssessment,a.soapPlan,
    [...(a.complaintTags??[])].sort(),entries(a.clinicalAnswers),entries(a.clinicalObservations),
    actions.filter(v=>v.appointmentId===a.id).map(v=>[v.id,v.vaccineName,v.vaccineSeries,v.vaccineValidUntil??""]).sort(([a],[b])=>a.localeCompare(b))]);
}
export const canModifyVisit=(a:Appointment|undefined)=>Boolean(a &&
  !["queued","sending","sent"].includes(a.vetisStatus??"") &&
  (["draft","in_progress","requires_external_attention"].includes(a.status)||a.vetisStatus==="fill_error"));
export const canModifyVaccination=(a:Appointment|undefined,submissions:ExternalSubmission[],actionId:string)=>
  canModifyVisit(a)&&!submissions.some(s=>s.actionId===actionId&&s.status==="sent");
