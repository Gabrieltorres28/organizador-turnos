import type { Adoration, Person, Shift } from "@/lib/adoration/types"
import { formatLongDate } from "@/lib/adoration/dates"
import { getShiftCoverage, sortShiftsByTime } from "@/lib/adoration/schedule"

export function buildAgendaShareText(
  adoration: Adoration,
  shifts: Shift[],
  people: Person[],
): string {
  const peopleById = new Map(people.map((person) => [person.id, person]))
  const orderedShifts = sortShiftsByTime(shifts)
  const coverage = getShiftCoverage(orderedShifts)
  const lines = [
    "ADORACIÓN AL SANTÍSIMO",
    "",
    formatLongDate(adoration.date),
    `${adoration.startTime} a ${adoration.endTime}`,
    "",
  ]

  for (const shift of orderedShifts) {
    const person = shift.personId ? peopleById.get(shift.personId) : undefined
    lines.push(
      `${shift.startTime} — ${person?.name ?? "⚠ SIN CUBRIR"}`,
    )
  }

  if (coverage.uncovered > 0) {
    lines.push("", `⚠ Hay ${coverage.uncovered} turnos sin cubrir.`)
  } else {
    lines.push("", "Todos los turnos están cubiertos.")
  }

  return lines.join("\n")
}

export async function shareAgendaText(text: string): Promise<"native" | "whatsapp"> {
  if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
    await navigator.share({
      title: "Adoración al Santísimo",
      text,
    })
    return "native"
  }

  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(text)}`
  window.open(whatsappUrl, "_blank", "noopener,noreferrer")
  return "whatsapp"
}
