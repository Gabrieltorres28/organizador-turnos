const WEEKDAYS = [
  "Domingo",
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
] as const

const WEEKDAY_ALIASES: Record<string, (typeof WEEKDAYS)[number]> = {
  domingo: "Domingo",
  dom: "Domingo",
  sun: "Domingo",
  sunday: "Domingo",
  lunes: "Lunes",
  lun: "Lunes",
  mon: "Lunes",
  monday: "Lunes",
  martes: "Martes",
  mar: "Martes",
  tue: "Martes",
  tuesday: "Martes",
  miércoles: "Miércoles",
  miercoles: "Miércoles",
  mié: "Miércoles",
  mie: "Miércoles",
  wed: "Miércoles",
  wednesday: "Miércoles",
  jueves: "Jueves",
  jue: "Jueves",
  thu: "Jueves",
  thursday: "Jueves",
  viernes: "Viernes",
  vie: "Viernes",
  fri: "Viernes",
  friday: "Viernes",
  sábado: "Sábado",
  sabado: "Sábado",
  sáb: "Sábado",
  sab: "Sábado",
  sat: "Sábado",
  saturday: "Sábado",
}

export function getLocalDateString(date = new Date()): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")

  return `${year}-${month}-${day}`
}

export function addDaysToDate(dateValue: string, days: number): string {
  const [year, month, day] = dateValue.split("-").map(Number)
  const date = new Date(year, month - 1, day, 12)
  date.setDate(date.getDate() + days)
  return getLocalDateString(date)
}

export function formatLongDate(dateValue: string): string {
  if (!dateValue) return ""

  const date = new Date(`${dateValue}T12:00:00Z`)
  const label = new Intl.DateTimeFormat("es-AR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  }).format(date)

  return label.charAt(0).toLocaleUpperCase("es-AR") + label.slice(1)
}

export function formatShortDate(dateValue: string): string {
  if (!dateValue) return ""

  return new Intl.DateTimeFormat("es-AR", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }).format(new Date(`${dateValue}T12:00:00Z`))
}

export function formatMonthYear(dateValue: string): string {
  if (!dateValue) return ""

  const label = new Intl.DateTimeFormat("es-AR", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${dateValue}T12:00:00Z`))

  return label.charAt(0).toLocaleUpperCase("es-AR") + label.slice(1)
}

export function getWeekdayName(dateValue: string): string {
  if (!dateValue) return ""

  return new Intl.DateTimeFormat("es-AR", {
    weekday: "long",
    timeZone: "UTC",
  })
    .format(new Date(`${dateValue}T12:00:00Z`))
    .toLocaleLowerCase("es-AR")
}

export function normalizeWeekday(value: string): string | null {
  const normalized = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[.,]/g, "")
    .trim()
    .toLocaleLowerCase("es-AR")

  const accentRestored =
    normalized === "miercoles" || normalized === "mie"
      ? normalized === "miercoles"
        ? "miércoles"
        : "mié"
      : normalized === "sabado" || normalized === "sab"
        ? normalized === "sabado"
          ? "sábado"
          : "sáb"
        : normalized

  return WEEKDAY_ALIASES[accentRestored] ?? WEEKDAY_ALIASES[normalized] ?? null
}

export function timeToMinutes(value: string): number | null {
  const match = value.trim().match(/^(\d{1,2}):(\d{2})$/)
  if (!match) return null

  const hours = Number(match[1])
  const minutes = Number(match[2])
  if (hours > 23 || minutes > 59) return null

  return hours * 60 + minutes
}

export function minutesToTime(value: number): string {
  const hours = Math.floor(value / 60)
  const minutes = value % 60
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`
}

export function normalizeTime(value: string): string {
  const minutes = timeToMinutes(value)
  return minutes === null ? value.trim() : minutesToTime(minutes)
}

export function getWeekdays(): readonly string[] {
  return WEEKDAYS.slice(1).concat(WEEKDAYS[0])
}
