import type { Person } from "@/lib/adoration/types"
import { getWeekdayName, normalizeWeekday, timeToMinutes } from "@/lib/adoration/dates"

export function getSuggestedPeople(
  people: Person[],
  adorationDate: string,
  shiftStartTime: string,
): Person[] {
  const targetDay = normalizeWeekday(getWeekdayName(adorationDate))
  const targetTime = timeToMinutes(shiftStartTime)

  if (targetDay === null || targetTime === null) return []

  return people
    .map((person) => {
      const firstMatch =
        normalizeWeekday(person.firstDay) === targetDay &&
        timeToMinutes(person.firstHour) === targetTime
      const secondMatch =
        normalizeWeekday(person.secondDay) === targetDay &&
        timeToMinutes(person.secondHour) === targetTime

      return { person, score: Number(firstMatch) + Number(secondMatch) }
    })
    .filter((result) => result.score > 0)
    .sort((left, right) => right.score - left.score)
    .map((result) => result.person)
}
