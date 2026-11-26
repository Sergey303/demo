export type AppointmentStatus =
  | "draft"
  | "in_progress"
  | "completed_internal"
  | "requires_external_attention"
  | "completed_with_external_success";

export type ExternalStatus =
  | "not_required"
  | "not_ready"
  | "ready"
  | "sent"
  | "failed_requires_edit";

export type VetisSendStatus =
  | "not_started"
  | "queued"
  | "sending"
  | "sent"
  | "fill_error";

export type Role = "doctor" | "registrar" | "external_specialist";
export type PrimeThemeKey =
  | "lara-light-blue"
  | "lara-light-indigo"
  | "lara-dark-blue"
  | "saga-blue"
  | "saga-green"
  | "saga-orange"
  | "saga-purple"
  | "soho-light"
  | "soho-dark"
  | "viva-light"
  | "viva-dark";

export type SoapField =
  | "complaint"
  | "soapObjective"
  | "soapAssessment"
  | "soapPlan";

export type Animal = { id: string; name: string; species: string; chip: string; ownerId: string };
export type Owner = { id: string; fullName: string; phone: string };
export type Clinic = { id: string; name: string };

export type Appointment = {
  id: string;
  clinicId: string;
  doctor: string;
  ownerId: string;
  animalId: string;
  reason: string;
  startedAt: string;
  status: AppointmentStatus;
  vetisStatus?: VetisSendStatus;
  complaint: string;
  complaintTags?: string[];
  draftCheckpoint?: string;
  draftSavedAt?: string;
  clinicalAnswers?: import("./clinicalDemo").ClinicalAnswers;
  clinicalObservations?: import("./clinicalStages").ClinicalObservations;
  soapObjective: string;
  soapAssessment: string;
  soapPlan: string;
};

export type AppointmentAction = {
  id: string;
  appointmentId: string;
  type: "vaccination";
  vaccineName: string;
  vaccineSeries: string;
  vaccineValidUntil?: string;
};

export type ExternalSubmission = {
  id: string;
  appointmentId: string;
  actionId: string;
  status: ExternalStatus;
  humanErrorMessage: string;
  problemFieldPath: string | null;
};

export type Notification = {
  id: string;
  appointmentId: string;
  text: string;
  status: "open" | "resolved";
};

export type AuditEvent = { id: string; appointmentId: string; text: string; at: string };

export type LocalDictionaryValue = {
  id: string;
  code: "vaccine";
  name: string;
  scope: "clinic";
};

export type SearchReason =
  | "owner_name_match"
  | "phone_match"
  | "animal_name_match"
  | "chip_match"
  | "possible_duplicate";

export type SearchResult = {
  owner: Owner;
  animal: Animal;
  reason: SearchReason;
};
