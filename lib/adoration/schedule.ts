import type { Shift } from "@/lib/adoration/types"
import { createId } from "@/lib/adoration/ids"
import { minutesToTime, timeToMinutes } from "@/lib/adoration/dates"

export function createShiftsForAdoration(
  adorationId: string,
  startTime: string,
  endTime: string,
  durationMinutes: number,
): Shift[] {
  const start = timeToMinutes(startTime)
  const end = timeToMinutes(endTime)

  if (
    start === null ||
    end === null ||
    end <= start ||
    !Number.isInteger(durationMinutes) ||
    durationMinutes <= 0
  ) {
    return []
  }

  const shifts: Shift[] = []
  for (let cursor = start; cursor < end; cursor += durationMinutes) {
    shifts.push({
      id: createId("shift"),
      adorationId,
      startTime: minutesToTime(cursor),
      endTime: minutesToTime(Math.min(cursor + durationMinutes, end)),
      personId: null,
      status: "unassigned",
    })
  }

  return shifts
}

export function getShiftCoverage(shifts: Shift[]) {
  const covered = shifts.filter(
    (shift) => shift.personId !== null && shift.status !== "unassigned",
  ).length

  return {
    total: shifts.length,
    covered,
    uncovered: shifts.length - covered,
  }
}

export function sortShiftsByTime(shifts: Shift[]): Shift[] {
  return [...shifts].sort((left, right) => {
    const leftStart = timeToMinutes(left.startTime) ?? 0
    const rightStart = timeToMinutes(right.startTime) ?? 0
    return leftStart - rightStart
  })
}
