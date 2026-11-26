import {draftSignature} from "../entities/draftCheckpoint";
import type { Appointment, AppointmentAction, AuditEvent, ExternalSubmission, Notification } from "../entities/types";
import { externalSubmissionsForConfirmedVaccinations } from "../entities/vaccinationDisplay";
import { evaluateVetisSubmission } from "../entities/vetisValidation";
import { pickVetisFillError } from "../entities/vetisFillErrors";
import type { AppState, FocusedProblem } from "./state";

const attemptMarker = "Попытка отправки в ВЕТИС";

export const appendAudit = (state: AppState, appointmentId: string, text: string): AuditEvent[] => [
  ...state.audit,
  { id: `audit-${Date.now()}-${state.audit.length}`, appointmentId, text, at: new Date().toISOString() }
];

export const evaluateSubmission = (
  action: AppointmentAction,
  submission: ExternalSubmission,
  appointment?: Appointment
): ExternalSubmission => evaluateVetisSubmission(action, submission, appointment);

type CompletionResult = {
  appointments: AppState["appointments"];
  submissions: ExternalSubmission[];
  notifications: Notification[];
  focusedProblem: FocusedProblem;
  event: string | null;
};

const openFailureNotification = (items: Notification[], appointmentId: string, text: string): Notification[] => {
  const existing = items.find((item) => item.appointmentId === appointmentId);
  if (existing) {
    return items.map((item) =>
      item.appointmentId === appointmentId ? { ...item, text, status: "open" as const } : item
    );
  }
  return [...items, { id: `notif-${Date.now()}`, appointmentId, text, status: "open" as const }];
};

const resolveNotifications = (items: Notification[], appointmentId: string): Notification[] =>
  items.map((item) => (item.appointmentId === appointmentId ? { ...item, status: "resolved" as const } : item));

const nextVetisAttemptNumber = (state: AppState) =>
  state.audit.filter((item) => item.text.startsWith(attemptMarker)).length + 1;

const focusFirstProblem = (appointmentId: string, submissions: ExternalSubmission[], state: AppState) => {
  const problem = submissions.find((item) => item.problemFieldPath);
  return problem ? { appointmentId, actionId: problem.actionId, fieldPath: problem.problemFieldPath! } : state.focusedProblem;
};

const normalizeSubmissionBeforeSend = (
  submission: ExternalSubmission,
  actions: AppointmentAction[],
  appointment?: Appointment
) => {
  const action = actions.find((item) => item.id === submission.actionId);
  return action ? evaluateSubmission(action, submission, appointment) : submission;
};

const queueVetisSending = (state: AppState, appointmentId: string): CompletionResult => {
  const appointment = state.appointments.find((item) => item.id === appointmentId);
  const appointmentActions = state.actions.filter((item) => item.appointmentId === appointmentId);
  const appointmentSubmissions = state.submissions.filter((item) => item.appointmentId === appointmentId);
  const currentSubmissions = externalSubmissionsForConfirmedVaccinations(appointmentSubmissions, appointmentActions)
    .map((item) => normalizeSubmissionBeforeSend(item, appointmentActions, appointment));

  if (currentSubmissions.length === 0) {
    return {
      appointments: state.appointments.map((item) =>
        item.id === appointmentId ? { ...item, status: "completed_internal" as const, vetisStatus: "not_started" as const } : item
      ),
      submissions: state.submissions,
      notifications: resolveNotifications(state.notifications, appointmentId),
      focusedProblem: null,
      event: "Приём завершён без отправки в ВЕТИС"
    };
  }

  const currentSubmissionById = new Map(currentSubmissions.map((item) => [item.id, item]));

  if (!currentSubmissions.every((item) => item.status === "ready")) {
    return {
      appointments: state.appointments,
      submissions: state.submissions.map((item) => currentSubmissionById.get(item.id) ?? item),
      notifications: state.notifications,
      focusedProblem: focusFirstProblem(appointmentId, currentSubmissions, state),
      event: null
    };
  }
  return {
    appointments: state.appointments.map((item) =>
      item.id === appointmentId ? { ...item, status: "completed_internal" as const, vetisStatus: "queued" as const } : item
    ),
    submissions: state.submissions.map((item) =>
      currentSubmissionById.has(item.id)
        ? { ...currentSubmissionById.get(item.id)!, status: "ready" as const, humanErrorMessage: "", problemFieldPath: null }
        : item
    ),
    notifications: resolveNotifications(state.notifications, appointmentId),
    focusedProblem: null,
    event: "Приём завершён, отправка в ВЕТИС поставлена в очередь"
  };
};

export const completeOrRetry = (state: AppState, appointmentId: string): CompletionResult => queueVetisSending(state, appointmentId);

export const advanceVetisSendingState = (state: AppState, appointmentId: string): AppState => {
  const appointment = state.appointments.find((item) => item.id === appointmentId);
  if (!appointment) return state;

  if (appointment.vetisStatus === "queued") {
    return {
      ...state,
      appointments: state.appointments.map((item) =>
        item.id === appointmentId ? { ...item, vetisStatus: "sending" as const } : item
      ),
      audit: appendAudit(state, appointmentId, "ВЕТИС: отправка началась")
    };
  }

  if (appointment.vetisStatus !== "sending") return state;

  const appointmentActions = state.actions.filter((item) => item.appointmentId === appointmentId);
  const appointmentSubmissions = state.submissions.filter((item) => item.appointmentId === appointmentId);
  const currentSubmissions = externalSubmissionsForConfirmedVaccinations(appointmentSubmissions, appointmentActions);
  if (currentSubmissions.length === 0) return state;

  const attempt = nextVetisAttemptNumber(state);
  const rejected = attempt % 3 === 0;
  const currentSubmissionIds = new Set(currentSubmissions.map((item) => item.id));
  const failedSubmission = currentSubmissions[0];
  const fillError = pickVetisFillError(attempt);
  const failureText = `ВЕТИС вернул ошибку заполнения: ${fillError.message}`;
  const nextState: AppState = {
    ...state,
    appointments: state.appointments.map((item) => {
      if (item.id !== appointmentId) return item;
      return {
        ...item,
        status: rejected ? "requires_external_attention" as const : "completed_with_external_success" as const,
        vetisStatus: rejected ? "fill_error" as const : "sent" as const
      };
    }),
    submissions: state.submissions.map((item) => {
      if (!currentSubmissionIds.has(item.id)) return item;
      if (!rejected) return { ...item, status: "sent" as const, humanErrorMessage: "", problemFieldPath: null };
      return item.id === failedSubmission?.id
        ? {
            ...item,
            status: "failed_requires_edit" as const,
            humanErrorMessage: fillError.message,
            problemFieldPath: fillError.fieldPath
          }
        : { ...item, status: "ready" as const, humanErrorMessage: "", problemFieldPath: null };
    }),
    notifications: rejected
      ? openFailureNotification(state.notifications, appointmentId, failureText)
      : resolveNotifications(state.notifications, appointmentId),
    focusedProblem: rejected && failedSubmission && fillError.fieldPath
      ? { appointmentId, actionId: failedSubmission.actionId, fieldPath: fillError.fieldPath }
      : null
  };
  return {
    ...nextState,
    audit: appendAudit(
      nextState,
      appointmentId,
      rejected ? `${attemptMarker} №${attempt}: ошибка заполнения` : `${attemptMarker} №${attempt}: отправлено`
    )
  };
};

export const addAppointmentState = (
  state: AppState,
  appointment: Appointment,
  action?: AppointmentAction,
  submission?: ExternalSubmission
): AppState => ({
  ...state,
  appointments: [...state.appointments, {...appointment,draftCheckpoint:draftSignature(appointment,action?[action]:[])}],
  actions: action ? [...state.actions, action] : state.actions,
  submissions: submission ? [...state.submissions, submission] : state.submissions,
  audit: appendAudit(state, appointment.id, "Приём создан")
});

export const deleteAppointmentState = (state: AppState, appointmentId: string): AppState => {
  const sameAppointment = (item: { appointmentId: string }) => item.appointmentId === appointmentId;
  return {
    ...state,
    appointments: state.appointments.filter((item) => item.id !== appointmentId),
    actions: state.actions.filter((item) => !sameAppointment(item)),
    submissions: state.submissions.filter((item) => !sameAppointment(item)),
    notifications: state.notifications.filter((item) => !sameAppointment(item)),
    audit: state.audit.filter((item) => !sameAppointment(item)),
    focusedProblem: state.focusedProblem?.appointmentId === appointmentId ? null : state.focusedProblem
  };
};
