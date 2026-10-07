export type ShiftStatus = "confirmed" | "pending" | "unassigned"

export interface Person {
  id: string
  name: string
  phone: string
  address: string
  email: string
  firstHour: string
  firstDay: string
  secondHour: string
  secondDay: string
  createdAt: string
  updatedAt: string
}

export interface Adoration {
  id: string
  date: string
  startTime: string
  endTime: string
  createdAt: string
  updatedAt: string
}

export interface Shift {
  id: string
  adorationId: string
  startTime: string
  endTime: string
  personId: string | null
  status: ShiftStatus
}

export interface DemoIds {
  people: string[]
  adorations: string[]
  shifts: string[]
}

export interface AppSettings {
  schemaVersion: 1
  demoIds: DemoIds
}

export interface AppData {
  people: Person[]
  adorations: Adoration[]
  shifts: Shift[]
  settings: AppSettings
}

export type PersonDraft = Omit<Person, "id" | "createdAt" | "updatedAt">

export interface ImportedPerson extends PersonDraft {
  sourceRow: number
}

export interface ImportParseResult {
  records: ImportedPerson[]
  errors: string[]
  missingColumns: string[]
  totalRows: number
  warnings?: string[]
}

export interface ImportSummary {
  created: number
  updated: number
  errors: number
}
