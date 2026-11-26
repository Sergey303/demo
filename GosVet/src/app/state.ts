import { draftSignature, canModifyVisit, canModifyVaccination } from "../entities/draftCheckpoint";
import { isObservationId, isObservationValue, type ObservationValue } from "../entities/clinicalStages";
import { complaintTags, isClinicalQuestionId, isClinicalAnswer, type ClinicalAnswer } from "../entities/clinicalDemo";
import {
  actions,
  animals,
  appointments,
  audit,
  clinics,
  dictionaries,
  notifications,
  owners,
  submissions
} from "../demo-data/seed";
import {
  addAppointmentState,
  advanceVetisSendingState,
  appendAudit,
  completeOrRetry,
  deleteAppointmentState,
  evaluateSubmission
} from "./reducerHelpers";
import type {
  Appointment,
  AppointmentAction,
  AuditEvent,
  ExternalSubmission,
  LocalDictionaryValue,
  Notification,
  PrimeThemeKey,
  Role,
  SoapField
} from "../entities/types";

export type FocusedProblem = { appointmentId: string; actionId?: string; fieldPath: string } | null;

export type AppState = {
  clinics: typeof clinics;
  owners: typeof owners;
  animals: typeof animals;
  appointments: Appointment[];
  actions: AppointmentAction[];
  submissions: ExternalSubmission[];
  notifications: Notification[];
  dictionaries: LocalDictionaryValue[];
  audit: AuditEvent[];
  selectedClinicId: string;
  selectedRole: Role;
  selectedTheme: PrimeThemeKey;
  focusedProblem: FocusedProblem;
};

export const initialState: AppState = {
  clinics,
  owners,
  animals,
  appointments: appointments.map(a=>({...a,draftCheckpoint:draftSignature(a,actions)})),
  actions,
  submissions,
  notifications,
  dictionaries,
  audit,
  selectedClinicId: "clinic-akadem",
  selectedRole: "doctor",
  selectedTheme: "lara-light-blue",
  focusedProblem: null
};

type Action =
  | { type: "select_context"; clinicId: string; role: Role }
  | { type: "select_theme"; theme: PrimeThemeKey }
  | { type: "set_clinical_observation"; appointmentId: string; observationId: string; value: ObservationValue | null }
  | { type: "set_clinical_answer"; appointmentId: string; questionId: string; answer: ClinicalAnswer | null }
  | { type: "toggle_complaint_tag"; appointmentId: string; tag: string }
  | { type: "update_soap"; appointmentId: string; field: SoapField; value: string }
  | { type: "delete_vaccination_action"; actionId: string }
  | { type: "update_action"; actionId: string; vaccineName?: string; vaccineSeries?: string; vaccineValidUntil?: string }
  | { type: "add_vaccination_action"; action: AppointmentAction; submission: ExternalSubmission }
  | { type: "add_appointment"; appointment: Appointment; action?: AppointmentAction; submission?: ExternalSubmission }
  | { type: "delete_appointment"; appointmentId: string }
  | { type: "save_draft"; appointmentId: string }
  | { type: "check_readiness"; appointmentId: string }
  | { type: "complete"; appointmentId: string }
  | { type: "retry"; appointmentId: string }
  | { type: "advance_vetis_sending"; appointmentId: string }
  | { type: "open_notification"; notificationId: string }
  | { type: "add_dictionary"; value: string }
  | { type: "reset" };

const updateActionRows = (state: AppState, action: Extract<Action, { type: "update_action" }>) => {
  const current=state.actions.find(item=>item.id===action.actionId);
  if(!current||!canModifyVaccination(state.appointments.find(a=>a.id===current.appointmentId),state.submissions,current.id))return state;
  const actionsNext = state.actions.map((item) =>
    item.id === action.actionId
      ? {
          ...item,
          vaccineName: action.vaccineName ?? item.vaccineName,
          vaccineSeries: action.vaccineSeries ?? item.vaccineSeries,
          vaccineValidUntil: action.vaccineValidUntil ?? item.vaccineValidUntil
        }
      : item
  );
  const actionRow = actionsNext.find((item) => item.id === action.actionId);
  const appointment = actionRow ? state.appointments.find((item) => item.id === actionRow.appointmentId) : undefined;
  const submissionsNext = state.submissions.map((item) =>
    item.actionId === action.actionId && actionRow ? evaluateSubmission(actionRow, item, appointment) : item
  );
  return { ...state, actions: actionsNext, submissions: submissionsNext, audit: appendAudit(state,current.appointmentId,"Данные прививки изменены") };
};

export function reducer(state: AppState, action: Action): AppState {
  if (action.type === "reset") return { ...initialState };
  if (action.type === "select_context") return { ...state, selectedClinicId: action.clinicId, selectedRole: action.role };
  if (action.type === "select_theme") return { ...state, selectedTheme: action.theme };
  if (action.type === "add_appointment") return addAppointmentState(state, action.appointment, action.action, action.submission);
  if (action.type === "delete_appointment") return canModifyVisit(state.appointments.find(a=>a.id===action.appointmentId)) ? deleteAppointmentState(state, action.appointmentId) : state;
  if (action.type === "add_vaccination_action") {
    const appointment = state.appointments.find((item) => item.id === action.action.appointmentId);
    if(!canModifyVisit(appointment))return state;
    return {
      ...state,
      actions: [...state.actions, action.action],
      submissions: [...state.submissions, evaluateSubmission(action.action, action.submission, appointment)],
      audit: appendAudit(state, action.action.appointmentId, "Добавлена прививка")
    };
  }
  if (action.type === "add_dictionary") {
    const exists = state.dictionaries.some((item) => item.name.toLowerCase() === action.value.toLowerCase());
    if (exists) return state;
    const item = { id: `dict-${Date.now()}`, code: "vaccine" as const, name: action.value, scope: "clinic" as const };
    return { ...state, dictionaries: [...state.dictionaries, item] };
  }
  if (action.type === "set_clinical_observation") {
    const appointment=state.appointments.find(item=>item.id===action.appointmentId);
    if (!appointment || !isObservationId(action.observationId) ||
        (action.value!==null && !isObservationValue(action.value)) ||
        (!["draft","in_progress","requires_external_attention"].includes(appointment.status) && appointment.vetisStatus!=="fill_error")) return state;
    const observations={...appointment.clinicalObservations};
    if(action.value===null) delete observations[action.observationId];
    else observations[action.observationId]=action.value;
    return {...state,appointments:state.appointments.map(item=>item.id===appointment.id?{...item,clinicalObservations:observations}:item)};
  }
  if (action.type === "set_clinical_answer") {
    const appointment = state.appointments.find(item=>item.id===action.appointmentId);
    if (!appointment || !isClinicalQuestionId(action.questionId) ||
        (action.answer!==null && !isClinicalAnswer(action.answer)) ||
        (!["draft","in_progress","requires_external_attention"].includes(appointment.status) && appointment.vetisStatus!=="fill_error")) return state;
    const answers = {...appointment.clinicalAnswers};
    if (action.answer===null) delete answers[action.questionId];
    else answers[action.questionId]=action.answer;
    return {...state, appointments:state.appointments.map(item=>item.id===appointment.id ? {...item,clinicalAnswers:answers}:item)};
  }
  if (action.type === "toggle_complaint_tag") {
    const appointment = state.appointments.find(item => item.id === action.appointmentId);
    if (!appointment || !complaintTags.some(tag=>tag===action.tag) || (!["draft","in_progress","requires_external_attention"].includes(appointment.status) && appointment.vetisStatus !== "fill_error")) return state;
    const tags = appointment.complaintTags ?? [];
    return { ...state, appointments: state.appointments.map(item => item.id !== action.appointmentId ? item : {
      ...item, complaintTags: tags.includes(action.tag) ? tags.filter(tag => tag !== action.tag) : [...tags,action.tag].slice(0,12)
    }) };
  }
  if (action.type === "update_soap") {
    if(!canModifyVisit(state.appointments.find(a=>a.id===action.appointmentId)))return state;
    const appointmentsNext = state.appointments.map((item) =>
      item.id === action.appointmentId ? { ...item, [action.field]: action.value } : item
    );
    const appointmentNext = appointmentsNext.find((item) => item.id === action.appointmentId);
    const rows = state.actions.filter((item) => item.appointmentId === action.appointmentId);
    const submissionsNext = state.submissions.map((item) => {
      const row = rows.find((actionRow) => actionRow.id === item.actionId);
      return item.appointmentId === action.appointmentId && row
        ? evaluateSubmission(row, item, appointmentNext)
        : item;
    });
    return { ...state, appointments: appointmentsNext, submissions: submissionsNext };
  }
  if (action.type === "delete_vaccination_action") {
    const current=state.actions.find(v=>v.id===action.actionId);
    if(!current||!canModifyVaccination(state.appointments.find(a=>a.id===current.appointmentId),state.submissions,current.id))return state;
    const remaining=state.actions.filter(v=>v.id!==current.id);
    return {...state,actions:remaining,submissions:state.submissions.filter(s=>s.actionId!==current.id),
      focusedProblem:state.focusedProblem?.actionId===current.id?null:state.focusedProblem,
      audit:appendAudit(state,current.appointmentId,"Прививка удалена до отправки")};
  }
  if (action.type === "update_action") return updateActionRows(state, action);
  if (action.type === "save_draft") {
    const appointment = state.appointments.find((item) => item.id === action.appointmentId);
    if(!appointment||!canModifyVisit(appointment))return state;
    const checkpoint=draftSignature(appointment,state.actions);
    const keepCompletedErrorStatus=appointment.status==="requires_external_attention"||appointment.vetisStatus==="fill_error";
    return {...state,appointments:state.appointments.map(item=>item.id===appointment.id?{...item,draftCheckpoint:checkpoint,draftSavedAt:new Date().toISOString(),status:keepCompletedErrorStatus?item.status:"draft"}:item),
      audit:appendAudit(state,appointment.id,keepCompletedErrorStatus?"Правки для повторной отправки сохранены":"Черновик сохранён")};
  }
  if (action.type === "check_readiness") {
    const appointment = state.appointments.find((item) => item.id === action.appointmentId);
    const rows = state.actions.filter((item) => item.appointmentId === action.appointmentId);
    const submissionsNext = state.submissions.map((item) => {
      const row = rows.find((actionRow) => actionRow.id === item.actionId);
      return item.appointmentId === action.appointmentId && row ? evaluateSubmission(row, item, appointment) : item;
    });
    return { ...state, submissions: submissionsNext };
  }
  if (action.type === "complete" || action.type === "retry") {
    if(!canModifyVisit(state.appointments.find(a=>a.id===action.appointmentId)) || state.actions.some(v=>v.appointmentId===action.appointmentId&&(!v.vaccineName.trim()||!v.vaccineSeries.trim()||!v.vaccineValidUntil?.trim())))return state;
    const { event, ...result } = completeOrRetry(state, action.appointmentId);
    return { ...state, ...result, audit: event ? appendAudit(state, action.appointmentId, event) : state.audit };
  }
  if (action.type === "advance_vetis_sending") return advanceVetisSendingState(state, action.appointmentId);
  if (action.type === "open_notification") {
    const notif = state.notifications.find((item) => item.id === action.notificationId);
    const submission = state.submissions.find((item) => item.appointmentId === notif?.appointmentId && item.problemFieldPath);
    if (!notif || !submission || !submission.problemFieldPath) return state;
    return {
      ...state,
      focusedProblem: { appointmentId: notif.appointmentId, actionId: submission.actionId, fieldPath: submission.problemFieldPath }
    };
  }
  return state;
}

export type AppAction = Action;
