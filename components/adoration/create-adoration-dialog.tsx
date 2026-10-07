"use client"

import { useEffect, useState, type FormEvent } from "react"
import { AppDialog } from "@/components/adoration/app-dialog"
import { Button } from "@/components/ui/button"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"
import { addDaysToDate, getLocalDateString, timeToMinutes } from "@/lib/adoration/dates"
import { createId } from "@/lib/adoration/ids"
import { createShiftsForAdoration } from "@/lib/adoration/schedule"
import type { Adoration, Shift } from "@/lib/adoration/types"

type CreateAdorationDialogProps = {
  open: boolean
  adorations: Adoration[]
  onOpenChange: (open: boolean) => void
  onCreate: (adoration: Adoration, shifts: Shift[]) => Promise<void>
}

type FormState = {
  date: string
  startTime: string
  endTime: string
  duration: number
}

function nextFriday(): string {
  const today = getLocalDateString()
  const weekday = new Date().getDay()
  const daysUntilFriday = (5 - weekday + 7) % 7 || 7
  return addDaysToDate(today, daysUntilFriday)
}

function initialFormState(): FormState {
  return {
    date: nextFriday(),
    startTime: "08:00",
    endTime: "20:00",
    duration: 60,
  }
}

export function CreateAdorationDialog({
  open,
  adorations,
  onOpenChange,
  onCreate,
}: CreateAdorationDialogProps) {
  const [form, setForm] = useState<FormState>(initialFormState)
  const [formError, setFormError] = useState("")
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    setForm(initialFormState())
    setFormError("")
  }, [open])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFormError("")

    const start = timeToMinutes(form.startTime)
    const end = timeToMinutes(form.endTime)
    if (!form.date || start === null || end === null || end <= start) {
      setFormError("Revisa la fecha y el horario de la jornada.")
      return
    }

    const overlaps = adorations.some((adoration) => {
      if (adoration.date !== form.date) return false
      const existingStart = timeToMinutes(adoration.startTime)
      const existingEnd = timeToMinutes(adoration.endTime)
      return (
        existingStart !== null &&
        existingEnd !== null &&
        start < existingEnd &&
        existingStart < end
      )
    })
    if (overlaps) {
      setFormError("Ya existe una jornada que se superpone con ese horario.")
      return
    }

    const adoration: Adoration = {
      id: createId("adoration"),
      date: form.date,
      startTime: form.startTime,
      endTime: form.endTime,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    const shifts = createShiftsForAdoration(
      adoration.id,
      adoration.startTime,
      adoration.endTime,
      form.duration,
    )

    if (shifts.length === 0) {
      setFormError("No se pudieron generar los turnos con ese horario.")
      return
    }

    setIsSaving(true)
    try {
      await onCreate(adoration, shifts)
      onOpenChange(false)
    } catch (error) {
      setFormError(
        error instanceof Error
          ? error.message
          : "No se pudo guardar la jornada. Inténtalo de nuevo.",
      )
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <AppDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Nueva jornada"
      description="Elige la fecha y el horario. Los turnos se generan automáticamente."
    >
      <form className="flex flex-col gap-5" onSubmit={handleSubmit}>
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="adoration-date">Fecha</FieldLabel>
            <Input
              id="adoration-date"
              type="date" lang="es-AR"
              className="min-h-11 px-3"
              required
              value={form.date}
              onChange={(event) =>
                setForm((current) => ({ ...current, date: event.target.value }))
              }
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field>
              <FieldLabel htmlFor="adoration-start">Desde</FieldLabel>
              <Input
                id="adoration-start"
                type="time" lang="es-AR"
                className="min-h-11 px-3"
                required
                value={form.startTime}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    startTime: event.target.value,
                  }))
                }
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="adoration-end">Hasta</FieldLabel>
              <Input
                id="adoration-end"
                type="time" lang="es-AR"
                className="min-h-11 px-3"
                required
                value={form.endTime}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    endTime: event.target.value,
                  }))
                }
              />
            </Field>
          </div>
          <Field>
            <FieldLabel htmlFor="adoration-duration">Duración de cada turno</FieldLabel>
            <NativeSelect
              id="adoration-duration"
              className="w-full [&>select]:h-11 [&>select]:px-3 [&>select]:text-base"
              value={String(form.duration)}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  duration: Number(event.target.value),
                }))
              }
            >
              <NativeSelectOption value="30">30 minutos</NativeSelectOption>
              <NativeSelectOption value="60">1 hora</NativeSelectOption>
              <NativeSelectOption value="90">1 hora y 30 minutos</NativeSelectOption>
              <NativeSelectOption value="120">2 horas</NativeSelectOption>
            </NativeSelect>
            <FieldDescription>
              Si queda un resto, el último turno será más corto.
            </FieldDescription>
          </Field>
        </FieldGroup>

        {formError ? (
          <FieldError role="alert">{formError}</FieldError>
        ) : null}

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="outline"
            size="lg"
            className="min-h-11 sm:min-w-28"
            disabled={isSaving}
            onClick={() => onOpenChange(false)}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            size="lg"
            className="min-h-11 sm:min-w-36"
            disabled={isSaving}
          >
            {isSaving ? "Guardando…" : "Crear jornada"}
          </Button>
        </div>
      </form>
    </AppDialog>
  )
}
