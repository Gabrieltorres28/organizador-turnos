"use client"

import { useEffect, useState, type FormEvent } from "react"
import type { Person, PersonDraft } from "@/lib/adoration/types"
import { getWeekdays } from "@/lib/adoration/dates"
import { AppDialog } from "@/components/adoration/app-dialog"
import { Button } from "@/components/ui/button"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"

type PersonFormDialogProps = {
  open: boolean
  person?: Person
  onOpenChange: (open: boolean) => void
  onSave: (draft: PersonDraft, personId?: string) => Promise<void>
}

function emptyDraft(): PersonDraft {
  return {
    name: "",
    phone: "",
    address: "",
    email: "",
    firstHour: "",
    firstDay: "",
    secondHour: "",
    secondDay: "",
  }
}

export function PersonFormDialog({
  open,
  person,
  onOpenChange,
  onSave,
}: PersonFormDialogProps) {
  const [draft, setDraft] = useState<PersonDraft>(emptyDraft)
  const [formError, setFormError] = useState("")
  const [isSaving, setIsSaving] = useState(false)
  const weekdays = getWeekdays()

  useEffect(() => {
    if (!open) return

    setDraft(
      person
        ? {
            name: person.name,
            phone: person.phone,
            address: person.address,
            email: person.email,
            firstHour: person.firstHour,
            firstDay: person.firstDay,
            secondHour: person.secondHour,
            secondDay: person.secondDay,
          }
        : emptyDraft(),
    )
    setFormError("")
  }, [open, person])

  function updateDraft<Key extends keyof PersonDraft>(
    key: Key,
    value: PersonDraft[Key],
  ) {
    setDraft((current) => ({ ...current, [key]: value }))
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFormError("")
    setIsSaving(true)

    try {
      await onSave(
        {
          ...draft,
          name: draft.name.trim(),
          phone: draft.phone.trim(),
          address: draft.address.trim(),
          email: draft.email.trim(),
        },
        person?.id,
      )
      onOpenChange(false)
    } catch (error) {
      setFormError(
        error instanceof Error
          ? error.message
          : "No se pudo guardar la persona. Inténtalo de nuevo.",
      )
    } finally {
      setIsSaving(false)
    }
  }

  const phoneHasError = formError.toLocaleLowerCase("es-AR").includes("teléfono")

  return (
    <AppDialog
      open={open}
      onOpenChange={onOpenChange}
      title={person ? "Ficha de persona" : "Nueva persona"}
      description="Los datos se guardan solamente en este dispositivo."
    >
      <form className="flex flex-col gap-5" onSubmit={handleSubmit}>
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="person-name">Nombre completo</FieldLabel>
            <Input
              id="person-name"
              className="min-h-11 px-3"
              autoComplete="name"
              maxLength={120}
              required
              value={draft.name}
              onChange={(event) => updateDraft("name", event.target.value)}
            />
          </Field>
          <Field data-invalid={phoneHasError}>
            <FieldLabel htmlFor="person-phone">Teléfono</FieldLabel>
            <Input
              id="person-phone"
              type="tel"
              className="min-h-11 px-3"
              autoComplete="tel"
              maxLength={50}
              aria-invalid={phoneHasError}
              value={draft.phone}
              onChange={(event) => {
                updateDraft("phone", event.target.value)
                setFormError("")
              }}
              placeholder="Opcional"
            />
            {phoneHasError ? <FieldError>{formError}</FieldError> : null}
          </Field>
          <Field>
            <FieldLabel htmlFor="person-address">Domicilio</FieldLabel>
            <Input
              id="person-address"
              className="min-h-11 px-3"
              autoComplete="street-address"
              maxLength={240}
              value={draft.address}
              onChange={(event) => updateDraft("address", event.target.value)}
              placeholder="Opcional"
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="person-email">Mail</FieldLabel>
            <Input
              id="person-email"
              type="email"
              className="min-h-11 px-3"
              autoComplete="email"
              maxLength={254}
              value={draft.email}
              onChange={(event) => updateDraft("email", event.target.value)}
              placeholder="Opcional"
            />
          </Field>
        </FieldGroup>

        <FieldSet className="rounded-xl border border-border p-4">
          <FieldLegend>Disponibilidad habitual</FieldLegend>
          <FieldDescription>
            La agenda usará estos horarios para sugerir personas en cada turno.
          </FieldDescription>
          <FieldGroup className="mt-3 gap-4">
            <div className="grid grid-cols-2 gap-3">
              <Field>
                <FieldLabel htmlFor="person-first-hour">Primera hora</FieldLabel>
                <Input
                  id="person-first-hour"
                  type="time" lang="es-AR"
                  className="min-h-11 px-3"
                  value={draft.firstHour}
                  onChange={(event) =>
                    updateDraft("firstHour", event.target.value)
                  }
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="person-first-day">Primer día</FieldLabel>
                <NativeSelect
                  id="person-first-day"
                  className="w-full [&>select]:h-11 [&>select]:px-3 [&>select]:text-base"
                  value={draft.firstDay}
                  onChange={(event) =>
                    updateDraft("firstDay", event.target.value)
                  }
                >
                  <NativeSelectOption value="">Elegir día</NativeSelectOption>
                  {weekdays.map((day) => (
                    <NativeSelectOption key={day} value={day}>
                      {day}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field>
                <FieldLabel htmlFor="person-second-hour">Segunda hora</FieldLabel>
                <Input
                  id="person-second-hour"
                  type="time" lang="es-AR"
                  className="min-h-11 px-3"
                  value={draft.secondHour}
                  onChange={(event) =>
                    updateDraft("secondHour", event.target.value)
                  }
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="person-second-day">Segundo día</FieldLabel>
                <NativeSelect
                  id="person-second-day"
                  className="w-full [&>select]:h-11 [&>select]:px-3 [&>select]:text-base"
                  value={draft.secondDay}
                  onChange={(event) =>
                    updateDraft("secondDay", event.target.value)
                  }
                >
                  <NativeSelectOption value="">Elegir día</NativeSelectOption>
                  {weekdays.map((day) => (
                    <NativeSelectOption key={day} value={day}>
                      {day}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              </Field>
            </div>
          </FieldGroup>
        </FieldSet>

        {formError && !phoneHasError ? (
          <p className="text-sm text-destructive" role="alert">
            {formError}
          </p>
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
            {isSaving ? "Guardando…" : "Guardar persona"}
          </Button>
        </div>
      </form>
    </AppDialog>
  )
}
