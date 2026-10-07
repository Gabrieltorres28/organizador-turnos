import type { AppData, DemoIds, Person } from "@/lib/adoration/types"
import { createId } from "@/lib/adoration/ids"
import { createShiftsForAdoration } from "@/lib/adoration/schedule"

export function createDemoData(): AppData {
  const now = new Date().toISOString()
  const people: Person[] = [
    {
      id: createId("person"),
      name: "María González",
      phone: "+54 9 11 5550-1201",
      address: "Calle de ejemplo 123",
      email: "maria.gonzalez@example.com",
      firstHour: "08:00",
      firstDay: "Viernes",
      secondHour: "17:00",
      secondDay: "Domingo",
      createdAt: now,
      updatedAt: now,
    },
    {
      id: createId("person"),
      name: "José Rodríguez",
      phone: "+54 9 11 5550-1202",
      address: "Av. de ejemplo 456",
      email: "jose.rodriguez@example.com",
      firstHour: "09:00",
      firstDay: "Viernes",
      secondHour: "12:00",
      secondDay: "Miércoles",
      createdAt: now,
      updatedAt: now,
    },
    {
      id: createId("person"),
      name: "Ana Pérez",
      phone: "+54 9 11 5550-1203",
      address: "Pasaje de ejemplo 78",
      email: "ana.perez@example.com",
      firstHour: "10:00",
      firstDay: "Viernes",
      secondHour: "18:00",
      secondDay: "Sábado",
      createdAt: now,
      updatedAt: now,
    },
    {
      id: createId("person"),
      name: "Carlos Benítez",
      phone: "+54 9 11 5550-1204",
      address: "Calle de ejemplo 910",
      email: "carlos.benitez@example.com",
      firstHour: "11:00",
      firstDay: "Viernes",
      secondHour: "16:00",
      secondDay: "Domingo",
      createdAt: now,
      updatedAt: now,
    },
    {
      id: createId("person"),
      name: "Lucía Fernández",
      phone: "+54 9 11 5550-1205",
      address: "Av. de ejemplo 111",
      email: "lucia.fernandez@example.com",
      firstHour: "12:00",
      firstDay: "Viernes",
      secondHour: "19:00",
      secondDay: "Martes",
      createdAt: now,
      updatedAt: now,
    },
  ]

  const adoration = {
    id: createId("adoration"),
    date: "2026-10-09",
    startTime: "08:00",
    endTime: "20:00",
    createdAt: now,
    updatedAt: now,
  }

  const assignments: Array<number | null> = [
    0, 1, 2, 3, 4, 0, 1, 2, 3, 4, null, null,
  ]
  const shifts = createShiftsForAdoration(
    adoration.id,
    adoration.startTime,
    adoration.endTime,
    60,
  ).map((shift, index) => {
    const personIndex = assignments[index]
    if (personIndex === undefined || personIndex === null) return shift

    return {
      ...shift,
      personId: people[personIndex].id,
      status: index === 8 ? ("pending" as const) : ("confirmed" as const),
    }
  })

  const demoIds: DemoIds = {
    people: people.map((person) => person.id),
    adorations: [adoration.id],
    shifts: shifts.map((shift) => shift.id),
  }

  return {
    people,
    adorations: [adoration],
    shifts,
    settings: {
      schemaVersion: 1,
      demoIds,
    },
  }
}

type DemoRecordIds = Partial<{
  people: string[]
  adorations: string[]
  shifts: string[]
}>

export function forgetDemoMarkers<T extends DemoRecordIds>(
  data: AppData,
  changedRecords: T,
): AppData {
  const demoIds = data.settings.demoIds

  return {
    ...data,
    settings: {
      ...data.settings,
      demoIds: {
        people: demoIds.people.filter(
          (id) => !changedRecords.people?.includes(id),
        ),
        adorations: demoIds.adorations.filter(
          (id) => !changedRecords.adorations?.includes(id),
        ),
        shifts: demoIds.shifts.filter(
          (id) => !changedRecords.shifts?.includes(id),
        ),
      },
    },
  }
}

export function removeDemoData(data: AppData): AppData {
  const { people: demoPeople, adorations: demoAdorations, shifts: demoShifts } =
    data.settings.demoIds
  const removedPeople = new Set(demoPeople)
  const removedAdorations = new Set(demoAdorations)
  const removedShifts = new Set(demoShifts)

  return {
    ...data,
    people: data.people.filter((person) => !removedPeople.has(person.id)),
    adorations: data.adorations.filter(
      (adoration) => !removedAdorations.has(adoration.id),
    ),
    shifts: data.shifts
      .filter(
        (shift) =>
          !removedShifts.has(shift.id) &&
          !removedAdorations.has(shift.adorationId),
      )
      .map((shift) =>
        shift.personId && removedPeople.has(shift.personId)
          ? { ...shift, personId: null, status: "unassigned" as const }
          : shift,
      ),
    settings: {
      ...data.settings,
      demoIds: {
        people: [],
        adorations: [],
        shifts: [],
      },
    },
  }
}
