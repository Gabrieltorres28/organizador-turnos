import type {
  AppData,
  ImportParseResult,
  ImportedPerson,
  Person,
} from "@/lib/adoration/types"
import { createId } from "@/lib/adoration/ids"
import { getLocalDateString, normalizeWeekday } from "@/lib/adoration/dates"
import { forgetDemoMarkers } from "@/lib/adoration/seed"
import { normalizePhone } from "@/lib/adoration/people"

const MAX_EXCEL_FILE_SIZE = 15 * 1024 * 1024

const COLUMNS = [
  { label: "Nombre", key: "name" },
  { label: "Teléfono", key: "phone" },
  { label: "Domicilio", key: "address" },
  { label: "Mail", key: "email" },
  { label: "Primera hora", key: "firstHour" },
  { label: "Primer día", key: "firstDay" },
  { label: "Segunda hora", key: "secondHour" },
  { label: "Segundo día", key: "secondDay" },
] as const

type ColumnKey = (typeof COLUMNS)[number]["key"]

function normalizeHeader(value: unknown): string {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .replace(/\s+/g, " ")
    .toLocaleLowerCase("es-AR")
}

function cellText(value: unknown): string {
  if (value === null || value === undefined) return ""
  return String(value).trim()
}

function parseTimeCell(value: unknown): string | null {
  if (value === null || value === undefined || value === "") return ""

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return `${String(value.getUTCHours()).padStart(2, "0")}:${String(value.getUTCMinutes()).padStart(2, "0")}`
  }

  if (typeof value === "number" && value >= 0 && value < 1) {
    const totalMinutes = Math.round(value * 24 * 60) % (24 * 60)
    return `${String(Math.floor(totalMinutes / 60)).padStart(2, "0")}:${String(totalMinutes % 60).padStart(2, "0")}`
  }

  const match = cellText(value).match(
    /^(\d{1,2})[:.](\d{2})(?::\d{2})?\s*(a\.?m\.?|p\.?m\.?)?$/i,
  )
  if (!match) return null

  let hours = Number(match[1])
  const minutes = Number(match[2])
  const meridiem = match[3]?.replace(/\./g, "").toLocaleLowerCase("en-US")

  if (minutes > 59) return null
  if (meridiem) {
    if (hours < 1 || hours > 12) return null
    if (meridiem === "pm" && hours !== 12) hours += 12
    if (meridiem === "am" && hours === 12) hours = 0
  } else if (hours > 23) {
    return null
  }

  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`
}

function findHeaderRow(rows: unknown[][]): number {
  let bestRow = -1
  let bestScore = 0

  rows.slice(0, 10).forEach((row, rowIndex) => {
    const headers = new Set(row.map(normalizeHeader))
    const score = COLUMNS.filter((column) =>
      headers.has(normalizeHeader(column.label)),
    ).length

    if (score > bestScore) {
      bestScore = score
      bestRow = rowIndex
    }
  })

  return bestScore >= 3 ? bestRow : -1
}

function emptyResult(
  missingColumns: string[],
  error?: string,
): ImportParseResult {
  return {
    records: [],
    errors: error ? [error] : [],
    missingColumns,
    totalRows: 0,
    warnings: [],
  }
}

export async function parseExcelFile(file: File): Promise<ImportParseResult> {
  if (!file.name.toLocaleLowerCase("es-AR").endsWith(".xlsx")) {
    throw new Error("Selecciona un archivo de Excel con extensión .xlsx.")
  }
  if (file.size > MAX_EXCEL_FILE_SIZE) {
    throw new Error("El archivo supera el tamaño máximo de 15 MB.")
  }

  const XLSX = await import("xlsx")
  const workbook = XLSX.read(await file.arrayBuffer(), {
    type: "array",
    cellDates: true,
  })
  const sheetName = workbook.SheetNames[0]
  if (!sheetName) {
    return emptyResult(
      COLUMNS.map((column) => column.label),
      "El archivo no contiene una hoja para importar.",
    )
  }

  const sheet = workbook.Sheets[sheetName]
  const rows = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    raw: false,
    defval: "",
    blankrows: false,
  }) as unknown[][]
  const headerRowIndex = findHeaderRow(rows)
  if (headerRowIndex < 0) {
    return emptyResult(
      COLUMNS.map((column) => column.label),
      "No encontramos una fila con los encabezados requeridos.",
    )
  }

  const headerIndexes = new Map<ColumnKey, number>()
  const headerRow = rows[headerRowIndex]
  COLUMNS.forEach((column) => {
    const index = headerRow.findIndex(
      (value) => normalizeHeader(value) === normalizeHeader(column.label),
    )
    if (index >= 0) headerIndexes.set(column.key, index)
  })

  const missingColumns = COLUMNS.filter(
    (column) => !headerIndexes.has(column.key),
  ).map((column) => column.label)
  if (missingColumns.length > 0) {
    return {
      ...emptyResult(missingColumns),
      totalRows: rows
        .slice(headerRowIndex + 1)
        .filter((row) => row.some((value) => cellText(value) !== "")).length,
    }
  }

  const sourceRows = rows
    .slice(headerRowIndex + 1)
    .map((row, index) => ({ row, rowNumber: headerRowIndex + index + 2 }))
    .filter(({ row }) => row.some((value) => cellText(value) !== ""))
  const records: ImportedPerson[] = []
  const errors: string[] = []

  for (const { row, rowNumber } of sourceRows) {
    const get = (key: ColumnKey) => row[headerIndexes.get(key) ?? -1]
    const name = cellText(get("name"))
    const phone = cellText(get("phone"))
    const address = cellText(get("address"))
    const email = cellText(get("email"))
    const firstHourRaw = get("firstHour")
    const firstDayRaw = cellText(get("firstDay"))
    const secondHourRaw = get("secondHour")
    const secondDayRaw = cellText(get("secondDay"))
    const hasFirstHour = cellText(firstHourRaw) !== ""
    const hasSecondHour = cellText(secondHourRaw) !== ""
    const firstHour = hasFirstHour ? parseTimeCell(firstHourRaw) : ""
    const secondHour = hasSecondHour ? parseTimeCell(secondHourRaw) : ""
    const firstDay = firstDayRaw ? normalizeWeekday(firstDayRaw) : ""
    const secondDay = secondDayRaw ? normalizeWeekday(secondDayRaw) : ""
    const rowErrors: string[] = []

    if (!name) rowErrors.push("falta el nombre")
    if (name.length > 120) rowErrors.push("el nombre supera 120 caracteres")
    if (phone.length > 50) rowErrors.push("el teléfono supera 50 caracteres")
    if (address.length > 240) rowErrors.push("el domicilio supera 240 caracteres")
    if (
      email &&
      (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    ) {
      rowErrors.push("el mail no tiene un formato válido")
    }
    if (firstHour === null) rowErrors.push("la primera hora no es válida")
    if (secondHour === null) rowErrors.push("la segunda hora no es válida")
    if (firstDayRaw && !firstDay) rowErrors.push("el primer día no es válido")
    if (secondDayRaw && !secondDay) rowErrors.push("el segundo día no es válido")
    if (hasFirstHour !== Boolean(firstDayRaw)) {
      rowErrors.push("completa la primera hora y el primer día juntos")
    }
    if (hasSecondHour !== Boolean(secondDayRaw)) {
      rowErrors.push("completa la segunda hora y el segundo día juntos")
    }

    if (rowErrors.length > 0) {
      errors.push(`Fila ${rowNumber}: ${rowErrors.join("; ")}.`)
      continue
    }

    records.push({
      name,
      phone,
      address,
      email,
      firstHour: firstHour ?? "",
      firstDay: firstDay ?? "",
      secondHour: secondHour ?? "",
      secondDay: secondDay ?? "",
      sourceRow: rowNumber,
    })
  }

  const deduplicatedRecords: ImportedPerson[] = []
  const sourceIndexByPhone = new Map<string, number>()
  let hadRepeatedPhones = false

  for (const record of records) {
    const normalizedPhone = normalizePhone(record.phone)
    if (!normalizedPhone) {
      deduplicatedRecords.push(record)
      continue
    }

    const existingIndex = sourceIndexByPhone.get(normalizedPhone)
    if (existingIndex === undefined) {
      sourceIndexByPhone.set(normalizedPhone, deduplicatedRecords.length)
      deduplicatedRecords.push(record)
    } else {
      deduplicatedRecords[existingIndex] = record
      hadRepeatedPhones = true
    }
  }

  return {
    records: deduplicatedRecords,
    errors,
    missingColumns: [],
    totalRows: sourceRows.length,
    warnings: hadRepeatedPhones
      ? [
          "Hay teléfonos repetidos en el archivo; para cada número se usarán los datos de la última fila.",
        ]
      : [],
  }
}

export interface ImportSummary {
  created: number
  updated: number
  errors: number
}

export function mergeImportedPeople(
  data: AppData,
  records: ImportedPerson[],
  errorCount: number,
): { data: AppData; summary: ImportSummary } {
  const people = [...data.people]
  const changedDemoIds: string[] = []
  let created = 0
  let updated = 0

  for (const record of records) {
    const normalizedPhone = normalizePhone(record.phone)
    const existingIndex = normalizedPhone
      ? people.findIndex(
          (person) => normalizePhone(person.phone) === normalizedPhone,
        )
      : -1
    const timestamp = new Date().toISOString()
    const personFields = {
      name: record.name,
      phone: record.phone,
      address: record.address,
      email: record.email,
      firstHour: record.firstHour,
      firstDay: record.firstDay,
      secondHour: record.secondHour,
      secondDay: record.secondDay,
    }

    if (existingIndex >= 0) {
      const existingPerson = people[existingIndex]
      people[existingIndex] = {
        ...existingPerson,
        ...personFields,
        updatedAt: timestamp,
      }
      changedDemoIds.push(existingPerson.id)
      updated += 1
      continue
    }

    people.push({
      id: createId("person"),
      ...personFields,
      createdAt: timestamp,
      updatedAt: timestamp,
    } satisfies Person)
    created += 1
  }

  const nextData = forgetDemoMarkers(
    { ...data, people },
    { people: changedDemoIds },
  )

  return {
    data: nextData,
    summary: { created, updated, errors: errorCount },
  }
}

export async function exportPeopleToExcel(people: Person[]): Promise<void> {
  const XLSX = await import("xlsx")
  const rows = [
    COLUMNS.map((column) => column.label),
    ...people.map((person) => [
      person.name,
      person.phone,
      person.address,
      person.email,
      person.firstHour,
      person.firstDay,
      person.secondHour,
      person.secondDay,
    ]),
  ]
  const worksheet = XLSX.utils.aoa_to_sheet(rows)
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, "Personas")
  XLSX.writeFile(workbook, `personas-adoracion-${getLocalDateString()}.xlsx`)
}
