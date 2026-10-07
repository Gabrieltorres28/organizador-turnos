"use client"

import { useMemo, useState } from "react"
import {
  AlertTriangle,
  CalendarPlus,
  Check,
  ChevronDown,
  Clock3,
  Share2,
  UsersRound,
} from "lucide-react"
import { toast } from "sonner"
import { AppDialog } from "@/components/adoration/app-dialog"
import { CreateAdorationDialog } from "@/components/adoration/create-adoration-dialog"
import { ShiftEditorDialog } from "@/components/adoration/shift-editor-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { Field, FieldLabel } from "@/components/ui/field"
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"
import { formatLongDate, getLocalDateString, timeToMinutes } from "@/lib/adoration/dates"
import { forgetDemoMarkers } from "@/lib/adoration/seed"
import { getShiftCoverage, sortShiftsByTime } from "@/lib/adoration/schedule"
import { getSuggestedPeople } from "@/lib/adoration/suggestions"
import { buildAgendaShareText, shareAgendaText } from "@/lib/adoration/sharing"
import type { Adoration, AppData, Shift, ShiftStatus } from "@/lib/adoration/types"

type Commit = (
  update: (current: AppData) => AppData | Promise<AppData>,
) => Promise<AppData>

type AgendaScreenProps = {
  data: AppData
  commit: Commit
}

function sortAdorations(adorations: Adoration[]): Adoration[] {
  return [...adorations].sort(
    (first, second) =>
      first.date.localeCompare(second.date) ||
      first.startTime.localeCompare(second.startTime),
  )
}

export function AgendaScreen({ data, commit }: AgendaScreenProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [editingShiftId, setEditingShiftId] = useState<string | null>(null)
  const adorations = useMemo(() => sortAdorations(data.adorations), [data.adorations])
  const today = getLocalDateString()
  const defaultAdoration =
    adorations.find((adoration) => adoration.date >= today) ??
    adorations[adorations.length - 1] ??
    null
  const selectedAdoration =
    adorations.find((adoration) => adoration.id === selectedId) ??
    defaultAdoration
  const shifts = useMemo(
    () =>
      selectedAdoration
        ? sortShiftsByTime(
            data.shifts.filter(
              (shift) => shift.adorationId === selectedAdoration.id,
            ),
          )
        : [],
    [data.shifts, selectedAdoration],
  )
  const coverage = getShiftCoverage(shifts)
  const editingShift = data.shifts.find((shift) => shift.id === editingShiftId) ?? null
  const hasDemoData =
    data.settings.demoIds.people.length > 0 ||
    data.settings.demoIds.adorations.length > 0 ||
    data.settings.demoIds.shifts.length > 0

  async function createAdoration(adoration: Adoration, newShifts: Shift[]) {
    await commit((current) => ({
      ...current,
      adorations: [...current.adorations, adoration],
      shifts: [...current.shifts, ...newShifts],
    }))
    setSelectedId(adoration.id)
    toast.success("Jornada creada con sus turnos")
  }

  async function assignPerson(shiftId: string, personId: string | null) {
    let assignedName = ""
    await commit((current) => {
      const person = personId
        ? current.people.find((item) => item.id === personId)
        : undefined
      if (personId && !person) {
        throw new Error("No encontramos a esa persona en la lista.")
      }
      assignedName = person?.name ?? ""
      const next = {
        ...current,
        shifts: current.shifts.map((shift) =>
          shift.id === shiftId
            ? {
                ...shift,
                personId,
                status: personId ? "pending" as const : "unassigned" as const,
              }
            : shift,
        ),
      }
      return forgetDemoMarkers(next, {
        people: personId ? [personId] : [],
        shifts: [shiftId],
      })
    })
    toast.success(
      personId ? `${assignedName} quedó asignada al turno` : "Turno sin cubrir",
    )
  }

  async function setShiftStatus(shiftId: string, status: ShiftStatus) {
    await commit((current) => {
      const shift = current.shifts.find((item) => item.id === shiftId)
      if (!shift) throw new Error("No encontramos ese turno.")
      if (!shift.personId && status !== "unassigned") {
        throw new Error("Asigna una persona antes de confirmar el turno.")
      }
      const next = {
        ...current,
        shifts: current.shifts.map((item) =>
          item.id === shiftId ? { ...item, status } : item,
        ),
      }
      return forgetDemoMarkers(next, { shifts: [shiftId] })
    })
    toast.success(status === "confirmed" ? "Turno confirmado" : "Estado actualizado")
  }

  async function saveShiftTimes(
    shiftId: string,
    startTime: string,
    endTime: string,
  ) {
    await commit((current) => {
      const shift = current.shifts.find((item) => item.id === shiftId)
      const adoration = current.adorations.find(
        (item) => item.id === shift?.adorationId,
      )
      if (!shift || !adoration) throw new Error("No encontramos ese turno.")

      const start = timeToMinutes(startTime)
      const end = timeToMinutes(endTime)
      const adorationStart = timeToMinutes(adoration.startTime)
      const adorationEnd = timeToMinutes(adoration.endTime)
      if (
        start === null ||
        end === null ||
        end <= start ||
        adorationStart === null ||
        adorationEnd === null ||
        start < adorationStart ||
        end > adorationEnd
      ) {
        throw new Error("El horario debe quedar dentro de la jornada y tener una duración válida.")
      }

      const overlaps = current.shifts.some((other) => {
        if (other.adorationId !== shift.adorationId || other.id === shiftId) {
          return false
        }
        const otherStart = timeToMinutes(other.startTime)
        const otherEnd = timeToMinutes(other.endTime)
        return (
          otherStart !== null &&
          otherEnd !== null &&
          start < otherEnd &&
          otherStart < end
        )
      })
      if (overlaps) {
        throw new Error("Ese horario se superpone con otro turno de la jornada.")
      }

      const next = {
        ...current,
        shifts: current.shifts.map((item) =>
          item.id === shiftId ? { ...item, startTime, endTime } : item,
        ),
      }
      return forgetDemoMarkers(next, { shifts: [shiftId] })
    })
  }

  async function deleteShift(shiftId: string) {
    await commit((current) => {
      const next = {
        ...current,
        shifts: current.shifts.filter((shift) => shift.id !== shiftId),
      }
      return forgetDemoMarkers(next, { shifts: [shiftId] })
    })
    setEditingShiftId(null)
    toast.success("Turno quitado")
  }

  async function shareSelectedAgenda() {
    if (!selectedAdoration) return
    const text = buildAgendaShareText(selectedAdoration, shifts, data.people)
    try {
      await shareAgendaText(text)
      toast.success("Agenda lista para compartir")
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") return
      toast.error("No se pudo abrir la opción para compartir.")
    }
  }

  return (
    <div className="flex flex-col gap-5 px-5 pb-6 pt-6">
      <header className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Adoración al Santísimo
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">Agenda</h1>
        </div>
        <Button
          type="button"
          variant="outline"
          size="lg"
          className="min-h-11 shrink-0"
          aria-label="Compartir jornada"
          disabled={!selectedAdoration}
          onClick={() => void shareSelectedAgenda()}
        >
          <Share2 data-icon="inline-start" aria-hidden="true" />
          Compartir
        </Button>
      </header>

      {hasDemoData ? (
        <div className="flex items-center gap-2">
          <Badge variant="outline">Muestra de ejemplo</Badge>
          <span className="text-xs text-muted-foreground">
            Puedes quitar estos datos desde Configuración.
          </span>
        </div>
      ) : null}

      {adorations.length > 0 ? (
        <Field>
          <FieldLabel htmlFor="selected-adoration">Jornada</FieldLabel>
          <NativeSelect
            id="selected-adoration"
            className="w-full [&>select]:h-11 [&>select]:px-3 [&>select]:text-base"
            value={selectedAdoration?.id ?? ""}
            onChange={(event) => setSelectedId(event.target.value)}
          >
            {adorations.map((adoration) => (
              <NativeSelectOption key={adoration.id} value={adoration.id}>
                {formatLongDate(adoration.date)} · {adoration.startTime}–{adoration.endTime}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </Field>
      ) : null}

      {selectedAdoration ? (
        <>
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <CardTitle className="text-xl font-semibold">
                    {formatLongDate(selectedAdoration.date)}
                  </CardTitle>
                  <CardDescription className="mt-1 flex items-center gap-1.5">
                    <Clock3 size={15} aria-hidden="true" />
                    {selectedAdoration.startTime} a {selectedAdoration.endTime}
                  </CardDescription>
                </div>
                <Badge variant="secondary">Jornada</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-3 gap-2 border-t border-border pt-4">
                <div>
                  <dt className="text-xs text-muted-foreground">Turnos</dt>
                  <dd className="mt-1 text-xl font-semibold tabular-nums">
                    {coverage.total}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Cubiertos</dt>
                  <dd className="mt-1 flex items-center gap-1.5 text-xl font-semibold tabular-nums">
                    <Check size={17} className="text-primary" aria-hidden="true" />
                    {coverage.covered}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Sin cubrir</dt>
                  <dd className="mt-1 flex items-center gap-1.5 text-xl font-semibold tabular-nums">
                    <AlertTriangle
                      size={17}
                      className={coverage.uncovered > 0 ? "text-destructive" : "text-primary"}
                      aria-hidden="true"
                    />
                    {coverage.uncovered}
                  </dd>
                </div>
              </dl>
            </CardContent>
          </Card>

          <section aria-labelledby="shifts-heading" className="flex flex-col gap-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 id="shifts-heading" className="text-lg font-semibold">
                  Turnos
                </h2>
                <p className="text-sm text-muted-foreground">
                  Toca un turno para editarlo o asignar una persona.
                </p>
              </div>
              {coverage.uncovered > 0 ? (
                <Badge variant="destructive">
                  <AlertTriangle data-icon="inline-start" aria-hidden="true" />
                  {coverage.uncovered} libres
                </Badge>
              ) : (
                <Badge variant="secondary">Completa</Badge>
              )}
            </div>

            {shifts.length > 0 ? (
              <div className="flex flex-col gap-2">
                {shifts.map((shift) => {
                  const person = data.people.find(
                    (item) => item.id === shift.personId,
                  )
                  const statusLabel =
                    shift.status === "confirmed"
                      ? "Confirmado"
                      : shift.personId
                        ? "Pendiente"
                        : "Sin cubrir"

                  return (
                    <button
                      key={shift.id}
                      type="button"
                      className="w-full rounded-xl text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                      aria-label={`Editar turno ${shift.startTime} a ${shift.endTime}${person ? `, ${person.name}` : ", sin cubrir"}`}
                      onClick={() => setEditingShiftId(shift.id)}
                    >
                      <Card className="py-0 transition-shadow hover:shadow-md">
                        <CardContent className="flex min-h-[76px] items-center gap-3 py-3">
                          <div className="flex w-[4.25rem] shrink-0 flex-col items-center border-r border-border pr-3 text-center">
                            <span className="text-base font-semibold tabular-nums">
                              {shift.startTime}
                            </span>
                            <span className="text-xs text-muted-foreground tabular-nums">
                              {shift.endTime}
                            </span>
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-medium">
                              {person?.name ?? "Turno sin cubrir"}
                            </p>
                            <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                              <UsersRound size={14} aria-hidden="true" />
                              {person?.phone || (person ? "Sin teléfono" : "Busca una persona")}
                            </p>
                          </div>
                          <Badge
                            variant={
                              shift.status === "confirmed"
                                ? "secondary"
                                : shift.personId
                                  ? "outline"
                                  : "destructive"
                            }
                          >
                            {statusLabel}
                          </Badge>
                        </CardContent>
                      </Card>
                    </button>
                  )
                })}
              </div>
            ) : (
              <Empty className="rounded-xl border border-dashed border-border bg-card">
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <CalendarPlus aria-hidden="true" />
                  </EmptyMedia>
                  <EmptyTitle>No hay turnos en esta jornada</EmptyTitle>
                  <EmptyDescription>
                    Puedes crear otra jornada para generar nuevos turnos.
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            )}
          </section>

          {adorations.length > 1 ? (
            <details className="group rounded-xl border border-border bg-card px-4">
              <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 py-3 font-medium outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
                <span>Todas las jornadas ({adorations.length})</span>
                <ChevronDown
                  className="transition-transform group-open:rotate-180"
                  size={18}
                  aria-hidden="true"
                />
              </summary>
              <div className="flex flex-col gap-2 border-t border-border py-3">
                {adorations.map((adoration) => {
                  const sessionShifts = data.shifts.filter(
                    (shift) => shift.adorationId === adoration.id,
                  )
                  const sessionCoverage = getShiftCoverage(sessionShifts)
                  return (
                    <button
                      key={adoration.id}
                      type="button"
                      className="flex min-h-12 items-center justify-between gap-3 rounded-lg px-2 text-left hover:bg-muted focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                      aria-current={
                        selectedAdoration.id === adoration.id ? "true" : undefined
                      }
                      onClick={() => setSelectedId(adoration.id)}
                    >
                      <span className="min-w-0">
                        <span className="block truncate font-medium">
                          {formatLongDate(adoration.date)}
                        </span>
                        <span className="block text-sm text-muted-foreground">
                          {adoration.startTime} a {adoration.endTime}
                        </span>
                      </span>
                      <Badge
                        variant={
                          sessionCoverage.uncovered > 0 ? "destructive" : "secondary"
                        }
                      >
                        {sessionCoverage.covered}/{sessionCoverage.total}
                      </Badge>
                    </button>
                  )
                })}
              </div>
            </details>
          ) : null}
        </>
      ) : (
        <Empty className="rounded-2xl border border-dashed border-border bg-card px-5 py-10">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <CalendarPlus aria-hidden="true" />
            </EmptyMedia>
            <EmptyTitle>Aún no hay jornadas</EmptyTitle>
            <EmptyDescription>
              Crea una jornada y la agenda generará automáticamente los turnos.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button
              type="button"
              size="lg"
              className="min-h-11"
              onClick={() => setCreateOpen(true)}
            >
              <CalendarPlus data-icon="inline-start" aria-hidden="true" />
              Crear primera jornada
            </Button>
          </EmptyContent>
        </Empty>
      )}

      {selectedAdoration ? (
        <Button
          type="button"
          size="lg"
          className="min-h-11 w-full"
          onClick={() => setCreateOpen(true)}
        >
          <CalendarPlus data-icon="inline-start" aria-hidden="true" />
          Nueva jornada
        </Button>
      ) : null}

      {adorations.length > 0 && !selectedAdoration ? (
        <Button
          type="button"
          size="lg"
          className="min-h-11 w-full"
          onClick={() => setCreateOpen(true)}
        >
          <CalendarPlus data-icon="inline-start" aria-hidden="true" />
          Nueva jornada
        </Button>
      ) : null}

      <CreateAdorationDialog
        open={createOpen}
        adorations={data.adorations}
        onOpenChange={setCreateOpen}
        onCreate={createAdoration}
      />

      <ShiftEditorDialog
        open={Boolean(editingShift && selectedAdoration)}
        shift={editingShift}
        adoration={selectedAdoration}
        people={data.people}
        suggestions={
          editingShift && selectedAdoration
            ? getSuggestedPeople(
                data.people,
                selectedAdoration.date,
                editingShift.startTime,
              )
            : []
        }
        onOpenChange={(open) => {
          if (!open) setEditingShiftId(null)
        }}
        onAssign={assignPerson}
        onSetStatus={setShiftStatus}
        onSaveTimes={saveShiftTimes}
        onDelete={deleteShift}
      />
    </div>
  )
}
