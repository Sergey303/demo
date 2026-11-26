import type {
  Animal,
  Appointment,
  AppointmentAction,
  AuditEvent,
  Clinic,
  ExternalSubmission,
  LocalDictionaryValue,
  Notification,
  Owner
} from "../entities/types";

export const clinics: Clinic[] = [
  { id: "clinic-akadem", name: "Академгородок" },
  { id: "clinic-center", name: "Центральная" }
];

export const owners: Owner[] = [
  { id: "owner-1", fullName: "Иванова Марина Петровна", phone: "+70000000001" },
  { id: "owner-2", fullName: "Петров Андрей Сергеевич", phone: "+70000000002" }
];

export const animals: Animal[] = [
  { id: "animal-1", name: "Барсик", species: "Кошка", chip: "RU-1001", ownerId: "owner-1" },
  { id: "animal-2", name: "Рекс", species: "Собака", chip: "RU-2002", ownerId: "owner-2" }
];

export const appointments: Appointment[] = [
  {
    id: "demo-001",
    clinicId: "clinic-akadem",
    doctor: "Соколова Анна Викторовна",
    ownerId: "owner-1",
    animalId: "animal-1",
    reason: "Вакцинация",
    startedAt: "2026-06-01T08:00:00Z",
    status: "in_progress",
    complaint: "",
    soapObjective: "",
    soapAssessment: "",
    soapPlan: ""
  },
  {
    id: "demo-002",
    clinicId: "clinic-akadem",
    doctor: "Соколова Анна Викторовна",
    ownerId: "owner-2",
    animalId: "animal-2",
    reason: "Контрольный осмотр",
    startedAt: "2026-06-01T09:30:00Z",
    status: "draft",
    complaint: "",
    soapObjective: "",
    soapAssessment: "",
    soapPlan: ""
  },
  {
    id: "demo-003",
    clinicId: "clinic-akadem",
    doctor: "Кузнецов Илья Сергеевич",
    ownerId: "owner-1",
    animalId: "animal-1",
    reason: "Первичный осмотр",
    startedAt: "2026-05-18T07:30:00Z",
    status: "completed_internal",
    complaint: "Снижение аппетита два дня",
    soapObjective: "Температура в норме, обезвоживания нет",
    soapAssessment: "Лёгкое расстройство ЖКТ",
    soapPlan: "Диета 48 часов, контроль состояния"
  }
];

export const actions: AppointmentAction[] = [];

export const submissions: ExternalSubmission[] = [];

export const notifications: Notification[] = [];

export const dictionaries: LocalDictionaryValue[] = [
  { id: "dict-1", code: "vaccine", name: "Рабифел", scope: "clinic" }
];

export const audit: AuditEvent[] = [
  { id: "audit-1", appointmentId: "demo-001", text: "Приём открыт", at: "2026-06-01T08:00:00Z" }
];
