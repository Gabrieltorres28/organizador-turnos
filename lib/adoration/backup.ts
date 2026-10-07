import type {
  AppData,
  Adoration,
  Person,
  Shift,
  ShiftStatus,
} from "@/lib/adoration/types"

const BACKUP_FORMAT = "agenda-de-adoracion"
const BACKUP_VERSION = 1

type BackupDocument = AppData & {
  format: typeof BACKUP_FORMAT
  backupVersion: typeof BACKUP_VERSION
  exportedAt: string
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function hasStringFields(
  value: unknown,
  fields: string[],
): value is Record<string, unknown> {
  return (
    isRecord(value) && fields.every((field) => typeof value[field] === "string")
  )
}

function isPerson(value: unknown): value is Person {
  return hasStringFields(value, [
    "id",
    "name",
    "phone",
    "address",
    "email",
    "firstHour",
    "firstDay",
    "secondHour",
    "secondDay",
    "createdAt",
    "updatedAt",
  ])
}

function isAdoration(value: unknown): value is Adoration {
  return hasStringFields(value, [
    "id",
    "date",
    "startTime",
    "endTime",
    "createdAt",
    "updatedAt",
  ])
}

function isShift(value: unknown): value is Shift {
  if (
    !hasStringFields(value, [
      "id",
      "adorationId",
      "startTime",
      "endTime",
    ]) ||
    !(value.personId === null || typeof value.personId === "string")
  ) {
    return false
  }

  return ["confirmed", "pending", "unassigned"].includes(
    value.status as ShiftStatus,
  )
}

export function createBackupDocument(data: AppData): BackupDocument {
  return {
    format: BACKUP_FORMAT,
    backupVersion: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    ...data,
  }
}

export function parseBackupDocument(text: string): AppData {
  let parsed: unknown

  try {
    parsed = JSON.parse(text)
  } catch {
    throw new Error("El archivo no contiene una copia JSON válida.")
  }

  if (
    !isRecord(parsed) ||
    parsed.format !== BACKUP_FORMAT ||
    parsed.backupVersion !== BACKUP_VERSION
  ) {
    throw new Error("Esta copia no es compatible con Agenda de Adoración.")
  }

  const { people, adorations, shifts, settings } = parsed
  if (
    !Array.isArray(people) ||
    !people.every(isPerson) ||
    !Array.isArray(adorations) ||
    !adorations.every(isAdoration) ||
    !Array.isArray(shifts) ||
    !shifts.every(isShift) ||
    !isRecord(settings) ||
    settings.schemaVersion !== 1 ||
    !isRecord(settings.demoIds)
  ) {
    throw new Error("La copia está incompleta o tiene datos dañados.")
  }

  const demoIds = settings.demoIds
  if (
    !Array.isArray(demoIds.people) ||
    !demoIds.people.every((id) => typeof id === "string") ||
    !Array.isArray(demoIds.adorations) ||
    !demoIds.adorations.every((id) => typeof id === "string") ||
    !Array.isArray(demoIds.shifts) ||
    !demoIds.shifts.every((id) => typeof id === "string")
  ) {
    throw new Error("La copia contiene configuraciones incompletas.")
  }

  const personIds = new Set(people.map((person) => person.id))
  const adorationIds = new Set(adorations.map((adoration) => adoration.id))
  const uniqueIds = (records: Array<{ id: string }>) =>
    new Set(records.map((record) => record.id)).size === records.length

  if (
    !uniqueIds(people) ||
    !uniqueIds(adorations) ||
    !uniqueIds(shifts) ||
    shifts.some(
      (shift) =>
        !adorationIds.has(shift.adorationId) ||
        (shift.personId !== null && !personIds.has(shift.personId)),
    )
  ) {
    throw new Error("La copia contiene turnos sin jornada o persona asociada.")
  }

  return {
    people,
    adorations,
    shifts,
    settings: {
      schemaVersion: 1,
      demoIds: {
        people: demoIds.people.filter((id): id is string => personIds.has(id)),
        adorations: demoIds.adorations.filter((id): id is string =>
          adorationIds.has(id),
        ),
        shifts: demoIds.shifts.filter((id): id is string =>
          shifts.some((shift) => shift.id === id),
        ),
      },
    },
  }
}
