"use client"

import { useEffect, useMemo, useState } from "react"
import { Search, Sparkles, Trash2, UserRound, UserRoundX } from "lucide-react"
import { toast } from "sonner"
import { AppDialog } from "@/components/adoration/app-dialog"
import { ConfirmDialog } from "@/components/adoration/confirm-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"
import type { Adoration, Person, Shift, ShiftStatus } from "@/lib/adoration/types"

type ShiftEditorDialogProps = {
  open: boolean
  shift: Shift | null
  adoration: Adoration | null
  people: Person[]
  suggestions: Person[]
  onOpenChange: (open: boolean) => void
  onAssign: (shiftId: string, personId: string | null) => Promise<void>
  onSetStatus: (shiftId: string, status: ShiftStatus) => Promise<void>
  onSaveTimes: (
    shiftId: string,
    startTime: string,
    endTime: string,
  ) => Promise<void>
  onDelete: (shiftId: string) => Promise<void>
}

export function ShiftEditorDialog({
  open,
  shift,
  adoration,
  people,
  suggestions,
  onOpenChange,
  onAssign,
  onSetStatus,
  onSaveTimes,
  onDelete,
}: ShiftEditorDialogProps) {
  const [search, setSearch] = useState("")
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [startTime, setStartTime] = useState("")
  const [endTime, setEndTime] = useState("")
  const [timeError, setTimeError] = useState("")
  const [isSavingTime, setIsSavingTime] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)

  useEffect(() => {
    if (!open || !shift) return
    setSearch("")
    setShowSuggestions(false)
    setStartTime(shift.startTime)
    setEndTime(shift.endTime)
    setTimeError("")
  }, [open, shift?.id, shift?.startTime, shift?.endTime])

  const currentPerson = useMemo(
    () => people.find((person) => person.id === shift?.personId),
    [people, shift?.personId],
  )
  const filteredPeople = useMemo(() => {
    const normalizedSearch = search.trim().toLocaleLowerCase("es-AR")
    const suggestedIds = new Set(suggestions.map((person) => person.id))

    return people
      .filter((person) => {
        const matchesSearch =
          !normalizedSearch ||
          person.name.toLocaleLowerCase("es-AR").includes(normalizedSearch) ||
          person.phone.toLocaleLowerCase("es-AR").includes(normalizedSearch) ||
          person.email.toLocaleLowerCase("es-AR").includes(normalizedSearch)
        return matchesSearch && (!showSuggestions || suggestedIds.has(person.id))
      })
      .sort((first, second) => first.name.localeCompare(second.name, "es-AR"))
  }, [people, search, showSuggestions, suggestions])

  if (!shift || !adoration) return null

  const activeShift = shift
  const hasTimeChanges =
    startTime !== activeShift.startTime || endTime !== activeShift.endTime

  async function handleAssign(personId: string | null) {
    try {
      await onAssign(activeShift.id, personId)
      setSearch("")
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "No se pudo actualizar la asignación.",
      )
    }
  }

  async function handleStatusChange(status: ShiftStatus) {
    try {
      await onSetStatus(activeShift.id, status)
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "No se pudo cambiar el estado del turno.",
      )
    }
  }

  async function handleSaveTimes() {
    setTimeError("")
    setIsSavingTime(true)
    try {
      await onSaveTimes(activeShift.id, startTime, endTime)
      toast.success("Horario actualizado")
    } catch (error) {
      setTimeError(
        error instanceof Error
          ? error.message
          : "No se pudo actualizar el horario.",
      )
    } finally {
      setIsSavingTime(false)
    }
  }

  async function handleDelete() {
    setIsDeleting(true)
    try {
      await onDelete(activeShift.id)
      setDeleteOpen(false)
      onOpenChange(false)
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <>
      <AppDialog
        open={open}
        onOpenChange={onOpenChange}
        title={`Turno ${shift.startTime} a ${shift.endTime}`}
        description="Asigna una persona, confirma su participación o ajusta el horario."
      >
        <div className="flex flex-col gap-6">
          <section aria-labelledby="shift-person-heading" className="flex flex-col gap-3">
            <div className="flex items-center justify-between gap-3">
              <h3 id="shift-person-heading" className="text-sm font-semibold">
                Persona asignada
              </h3>
              <Button
                type="button"
                variant={showSuggestions ? "secondary" : "outline"}
                size="lg"
                className="min-h-11"
                aria-pressed={showSuggestions}
                onClick={() => setShowSuggestions((current) => !current)}
              >
                <Sparkles data-icon="inline-start" aria-hidden="true" />
                {showSuggestions ? "Ver todas" : "Sugeridas"}
              </Button>
            </div>

            {currentPerson ? (
              <Card size="sm">
                <CardHeader className="flex grid-cols-1 flex-row items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-secondary text-secondary-foreground">
                      <UserRound size={18} aria-hidden="true" />
                    </span>
                    <div className="min-w-0">
                      <CardTitle className="truncate">{currentPerson.name}</CardTitle>
                      <p className="mt-0.5 truncate text-sm text-muted-foreground">
                        {currentPerson.phone || "Sin teléfono"}
                      </p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-lg"
                    className="min-h-11 min-w-11 shrink-0"
                    aria-label={`Quitar a ${currentPerson.name} del turno`}
                    onClick={() => void handleAssign(null)}
                  >
                    <UserRoundX data-icon="inline-start" aria-hidden="true" />
                  </Button>
                </CardHeader>
              </Card>
            ) : (
              <div className="flex items-center gap-3 rounded-xl border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive">
                <UserRoundX size={18} aria-hidden="true" />
                <p>Este turno todavía está sin cubrir.</p>
              </div>
            )}

            {shift.personId ? (
              <Field>
                <FieldLabel htmlFor="shift-status">Estado</FieldLabel>
                <NativeSelect
                  id="shift-status"
                  className="w-full [&>select]:h-11 [&>select]:px-3 [&>select]:text-base"
                  value={shift.status}
                  onChange={(event) =>
                    void handleStatusChange(event.target.value as ShiftStatus)
                  }
                >
                  <NativeSelectOption value="pending">Pendiente</NativeSelectOption>
                  <NativeSelectOption value="confirmed">Confirmado</NativeSelectOption>
                </NativeSelect>
              </Field>
            ) : null}

            <Field>
              <FieldLabel htmlFor="shift-person-search">
                {currentPerson ? "Cambiar persona" : "Buscar persona"}
              </FieldLabel>
              <div className="relative">
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                  size={18}
                  aria-hidden="true"
                />
                <Input
                  id="shift-person-search"
                  type="search"
                  className="min-h-11 pl-10 pr-3"
                  placeholder="Nombre, teléfono o mail"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
              </div>
            </Field>

            {showSuggestions ? (
              <p className="text-sm text-muted-foreground">
                Coinciden con {adoration.date === "" ? "la disponibilidad" : "el día y la hora"} de este turno. La sugerencia no asigna a nadie automáticamente.
              </p>
            ) : null}

            {filteredPeople.length > 0 ? (
              <div className="flex max-h-64 flex-col gap-2 overflow-y-auto" aria-label="Personas disponibles">
                {filteredPeople.map((person) => (
                  <Button
                    key={person.id}
                    type="button"
                    variant="outline"
                    size="lg"
                    className="min-h-11 w-full justify-between gap-3 px-3 text-left"
                    aria-label={`Asignar ${person.name}`}
                    onClick={() => void handleAssign(person.id)}
                  >
                    <span className="min-w-0 truncate">{person.name}</span>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {person.phone || "Sin teléfono"}
                    </span>
                  </Button>
                ))}
              </div>
            ) : (
              <p className="rounded-lg bg-muted px-3 py-3 text-sm text-muted-foreground">
                {showSuggestions && suggestions.length === 0
                  ? "No hay coincidencias de disponibilidad. Pulsa Ver todas para buscar entre todas las personas."
                  : showSuggestions
                    ? "No hay coincidencias con esa búsqueda. Pulsa Ver todas para ver a todas las personas."
                    : people.length === 0
                      ? "Agrega personas desde la pestaña Personas para asignar este turno."
                      : "No encontramos personas con esa búsqueda."}
              </p>
            )}
          </section>

          <section aria-labelledby="shift-time-heading" className="flex flex-col gap-3 border-t border-border pt-5">
            <div>
              <h3 id="shift-time-heading" className="text-sm font-semibold">
                Horario del turno
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Jornada: {adoration.startTime} a {adoration.endTime}
              </p>
            </div>
            <FieldGroup className="grid grid-cols-2 gap-3">
              <Field>
                <FieldLabel htmlFor="shift-start-time">Desde</FieldLabel>
                <Input
                  id="shift-start-time"
                  type="time" lang="es-AR"
                  className="min-h-11 px-3"
                  value={startTime}
                  onChange={(event) => {
                    setStartTime(event.target.value)
                    setTimeError("")
                  }}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="shift-end-time">Hasta</FieldLabel>
                <Input
                  id="shift-end-time"
                  type="time" lang="es-AR"
                  className="min-h-11 px-3"
                  value={endTime}
                  onChange={(event) => {
                    setEndTime(event.target.value)
                    setTimeError("")
                  }}
                />
              </Field>
            </FieldGroup>
            {timeError ? <FieldError role="alert">{timeError}</FieldError> : null}
            {hasTimeChanges ? (
              <Button
                type="button"
                variant="secondary"
                size="lg"
                className="min-h-11 self-start"
                disabled={isSavingTime}
                onClick={() => void handleSaveTimes()}
              >
                {isSavingTime ? "Guardando…" : "Guardar horario"}
              </Button>
            ) : null}
          </section>

          <div className="border-t border-border pt-4">
            <Button
              type="button"
              variant="destructive"
              size="lg"
              className="min-h-11 w-full"
              onClick={() => setDeleteOpen(true)}
            >
              <Trash2 data-icon="inline-start" aria-hidden="true" />
              Quitar este turno
            </Button>
          </div>
        </div>
      </AppDialog>

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Quitar turno"
        description={`Se quitará el turno de ${shift.startTime} a ${shift.endTime}. Esta acción no se puede deshacer.`}
        confirmLabel={isDeleting ? "Quitando…" : "Quitar turno"}
        destructive
        onConfirm={handleDelete}
      />
    </>
  )
}
