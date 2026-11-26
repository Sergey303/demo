import type { AppState } from "./state";
import { isClinicalQuestionId, isClinicalAnswer } from "../entities/clinicalDemo.ts";

const STORAGE_KEY = "gosvetclinic-demo-state-v1";
const VERSION = 2;
const MAX_STORAGE_CHARS = 2_000_000;
type Row = Record<string, unknown>;

function object(value: unknown): value is Row {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

const text = (value: unknown): value is string => typeof value === "string";
const member = (value: unknown, options: string[]) => text(value) && options.includes(value);
const strings = (row: Row, fields: string[]) => fields.every(field => text(row[field]));
const optionalText = (value: unknown) => value === undefined || text(value);
const rowValidators: Record<string, (row: Row) => boolean> = {
  clinics: row => strings(row, ["id", "name"]),
  owners: row => strings(row, ["id", "fullName", "phone"]),
  animals: row => strings(row, ["id", "name", "species", "chip", "ownerId"]),
  appointments: row => strings(row, ["id", "clinicId", "doctor", "ownerId", "animalId", "reason",
    "complaint", "soapObjective", "soapAssessment", "soapPlan"]) &&
    (row.complaintTags === undefined || (Array.isArray(row.complaintTags) && row.complaintTags.length <= 12 && row.complaintTags.every(value => typeof value === "string" && value.length <= 80))) &&
    (row.clinicalAnswers === undefined || (object(row.clinicalAnswers) && Object.entries(row.clinicalAnswers).every(([id,value])=>isClinicalQuestionId(id) && isClinicalAnswer(value)))) &&
    optionalText(row.startedAt) &&
    member(row.status, ["draft", "in_progress", "completed_internal", "requires_external_attention", "completed_with_external_success"]) &&
    (row.vetisStatus === undefined || member(row.vetisStatus, ["not_started", "queued", "sending", "sent", "fill_error"])),
  actions: row => strings(row, ["id", "appointmentId", "vaccineName", "vaccineSeries"]) &&
    row.type === "vaccination" && optionalText(row.vaccineValidUntil),
  submissions: row => strings(row, ["id", "appointmentId", "actionId", "humanErrorMessage"]) &&
    member(row.status, ["not_required", "not_ready", "ready", "sent", "failed_requires_edit"]) &&
    (row.problemFieldPath === null || text(row.problemFieldPath)),
  notifications: row => strings(row, ["id", "appointmentId", "text"]) && member(row.status, ["open", "resolved"]),
  dictionaries: row => strings(row, ["id", "name"]) && row.code === "vaccine" && row.scope === "clinic",
  audit: row => strings(row, ["id", "appointmentId", "text", "at"])
};

function validRows(value: unknown, validate: (row: Row) => boolean): boolean {
  if (!Array.isArray(value)) return false;
  const ids = new Set<string>();
  for (const row of value) {
    if (!object(row) || !validate(row) || !text(row.id) || !row.id || ids.has(row.id)) return false;
    ids.add(row.id);
  }
  return true;
}

function validState(value: unknown, legacy: boolean): value is Partial<AppState> {
  if (!object(value)) return false;
  const scalars: Record<string, (v: unknown) => boolean> = {
    selectedClinicId: v => text(v) && v.length > 0,
    selectedRole: v => member(v, ["doctor", "registrar", "external_specialist"]),
    selectedTheme: v => member(v, ["lara-light-blue", "lara-light-indigo", "lara-dark-blue",
      "saga-blue", "saga-green", "saga-orange", "saga-purple", "soho-light", "soho-dark", "viva-light", "viva-dark"]),
    focusedProblem: v => v === null || (object(v) && strings(v, ["appointmentId", "fieldPath"]) && optionalText(v.actionId))
  };
  const keys = [...Object.keys(rowValidators), ...Object.keys(scalars)];
  if (Object.keys(value).some(key => !keys.includes(key))) return false;
  return Object.entries(rowValidators).every(([key, validate]) =>
    legacy && !(key in value) || validRows(value[key], validate)) &&
    Object.entries(scalars).every(([key, validate]) =>
      legacy && !(key in value) || validate(value[key]));
}

export function decodeState(raw: string): Partial<AppState> | null {
  if (raw.length > MAX_STORAGE_CHARS) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!object(parsed)) return null;
    if ("version" in parsed) {
      if (parsed.version !== VERSION || !object(parsed.state)) return null;
      // Earlier completion reducers accidentally persisted their transient audit event.
      // Strip only that known field; all remaining snapshot validation still applies.
      const {event,...snapshot}=parsed.state;
      if (event!==undefined && event!==null && !text(event)) return null;
      return validState(snapshot, false) ? snapshot : null;
    }
    // Legacy snapshots contain the state directly; hydration supplies missing fields.
    return validState(parsed, true) ? parsed : null;
  } catch {
    return null;
  }
}

export function loadState(): Partial<AppState> | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? decodeState(raw) : null;
  } catch {
    return null;
  }
}

export function saveState(state: AppState): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: VERSION, state }));
  } catch {
    // demo should remain usable without storage
  }
}

export function clearState(): void {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
