"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { FileSpreadsheet, Pencil, Plus, Search, Trash2, Upload, UserRound } from "lucide-react"
import { toast } from "sonner"
import { ConfirmDialog } from "@/components/adoration/confirm-dialog"
import { ExcelImportDialog } from "@/components/adoration/excel-import-dialog"
import { PersonFormDialog } from "@/components/adoration/person-form-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { Field, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { forgetDemoMarkers } from "@/lib/adoration/seed"
import { normalizePhone } from "@/lib/adoration/people"
import { createId } from "@/lib/adoration/ids"
import { exportPeopleToExcel, mergeImportedPeople, parseExcelFile } from "@/lib/adoration/excel-import"
import type { AppData, ImportParseResult, ImportSummary, Person, PersonDraft } from "@/lib/adoration/types"

type Commit = (
  update: (current: AppData) => AppData | Promise<AppData>,
) => Promise<AppData>

type PeopleScreenProps = {
  data: AppData
  commit: Commit
  autoOpenImport: boolean
  onImportHandled: () => void
}

export function PeopleScreen({
  data,
  commit,
  autoOpenImport,
  onImportHandled,
}: PeopleScreenProps) {
  const [search, setSearch] = useState("")
  const [personDialogOpen, setPersonDialogOpen] = useState(false)
  const [editingPersonId, setEditingPersonId] = useState<string | null>(null)
  const [deletingPersonId, setDeletingPersonId] = useState<string | null>(null)
  const [importOpen, setImportOpen] = useState(false)
  const [importResult, setImportResult] = useState<ImportParseResult | null>(null)
  const [importSummary, setImportSummary] = useState<ImportSummary | null>(null)
  const [importError, setImportError] = useState("")
  const [isImporting, setIsImporting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!autoOpenImport) return
    setImportResult(null)
    setImportSummary(null)
    setImportError("")
    setImportOpen(true)
    onImportHandled()
  }, [autoOpenImport, onImportHandled])

  const filteredPeople = useMemo(() => {
    const normalizedSearch = search.trim().toLocaleLowerCase("es-AR")
    if (!normalizedSearch) {
      return [...data.people].sort((first, second) =>
        first.name.localeCompare(second.name, "es-AR"),
      )
    }

    return data.people
      .filter((person) =>
        [person.name, person.phone, person.email, person.address].some((value) =>
          value.toLocaleLowerCase("es-AR").includes(normalizedSearch),
        ),
      )
      .sort((first, second) => first.name.localeCompare(second.name, "es-AR"))
  }, [data.people, search])

  const editingPerson = data.people.find((person) => person.id === editingPersonId)
  const deletingPerson = data.people.find((person) => person.id === deletingPersonId)

  function openImport() {
    setImportResult(null)
    setImportSummary(null)
    setImportError("")
    setImportOpen(true)
  }

  function closeImport(open: boolean) {
    setImportOpen(open)
    if (!open) {
      setImportResult(null)
      setImportSummary(null)
      setImportError("")
    }
  }

  function chooseFile() {
    fileInputRef.current?.click()
  }

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget
    const file = input.files?.[0]
    if (!file) return

    setImportOpen(true)
    setImportResult(null)
    setImportSummary(null)
    setImportError("")
    try {
      setImportResult(await parseExcelFile(file))
    } catch (error) {
      setImportError(
        error instanceof Error
          ? error.message
          : "No se pudo leer la planilla. Revisa el archivo e inténtalo de nuevo.",
      )
    } finally {
      input.value = ""
    }
  }

  async function handleImport() {
    const parsedImport = importResult
    if (!parsedImport) return

    setIsImporting(true)
    try {
      let summary: ImportSummary = {
        created: 0,
        updated: 0,
        errors: parsedImport.errors.length,
      }
      await commit((current) => {
        const merged = mergeImportedPeople(
          current,
          parsedImport.records,
          parsedImport.errors.length,
        )
        summary = merged.summary
        return merged.data
      })
      setImportSummary(summary)
      toast.success(
        `Importación lista: ${summary.created} nuevas y ${summary.updated} actualizadas.`,
      )
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "No se pudo completar la importación.",
      )
    } finally {
      setIsImporting(false)
    }
  }

  async function savePerson(draft: PersonDraft, personId?: string) {
    await commit((current) => {
      const phoneKey = normalizePhone(draft.phone)
      const duplicate = phoneKey
        ? current.people.find(
            (person) =>
              person.id !== personId && normalizePhone(person.phone) === phoneKey,
          )
        : undefined
      if (duplicate) {
        throw new Error("Este teléfono ya está asociado a otra persona.")
      }

      const timestamp = new Date().toISOString()
      if (personId) {
        const existing = current.people.find((person) => person.id === personId)
        if (!existing) throw new Error("No encontramos esa persona.")
        const next = {
          ...current,
          people: current.people.map((person) =>
            person.id === personId
              ? { ...person, ...draft, updatedAt: timestamp }
              : person,
          ),
        }
        return forgetDemoMarkers(next, { people: [personId] })
      }

      const person: Person = {
        ...draft,
        id: createId("person"),
        createdAt: timestamp,
        updatedAt: timestamp,
      }
      return { ...current, people: [...current.people, person] }
    })
    toast.success(personId ? "Persona actualizada" : "Persona agregada")
  }

  async function deletePerson(personId: string) {
    await commit((current) => {
      const next = {
        ...current,
        people: current.people.filter((person) => person.id !== personId),
        shifts: current.shifts.map((shift) =>
          shift.personId === personId
            ? { ...shift, personId: null, status: "unassigned" as const }
            : shift,
        ),
      }
      return forgetDemoMarkers(next, { people: [personId] })
    })
    setDeletingPersonId(null)
    toast.success("Persona eliminada y turnos liberados")
  }

  async function handleExport() {
    try {
      await exportPeopleToExcel(data.people)
      toast.success("Archivo de personas descargado")
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "No se pudo exportar la lista de personas.",
      )
    }
  }

  return (
    <div className="flex flex-col gap-5 px-5 pb-6 pt-6">
      <header className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Comunidad
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">Personas</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {data.people.length} {data.people.length === 1 ? "persona" : "personas"} en tu lista
          </p>
        </div>
        <Badge variant="secondary" className="mt-1">
          {data.people.length}
        </Badge>
      </header>

      <div className="grid grid-cols-2 gap-2">
        <Button
          type="button"
          size="lg"
          className="min-h-11"
          onClick={() => {
            setEditingPersonId(null)
            setPersonDialogOpen(true)
          }}
        >
          <Plus data-icon="inline-start" aria-hidden="true" />
          Agregar
        </Button>
        <Button
          type="button"
          variant="outline"
          size="lg"
          className="min-h-11"
          onClick={() => {
            openImport()
            chooseFile()
          }}
        >
          <Upload data-icon="inline-start" aria-hidden="true" />
          Importar Excel
        </Button>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        className="sr-only"
        tabIndex={-1}
        aria-label="Elegir planilla de Excel"
        onChange={(event) => void handleFileChange(event)}
      />

      <Field>
        <FieldLabel className="sr-only" htmlFor="people-search">
          Buscar personas
        </FieldLabel>
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            size={18}
            aria-hidden="true"
          />
          <Input
            id="people-search"
            type="search"
            className="min-h-11 pl-10 pr-3"
            placeholder="Buscar nombre, teléfono o mail"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
      </Field>

      {filteredPeople.length > 0 ? (
        <section aria-label="Lista de personas" className="flex flex-col gap-2">
          {filteredPeople.map((person) => (
            <Card key={person.id} className="py-0">
              <CardContent className="flex min-h-[84px] items-center gap-2 py-2">
                <button
                  type="button"
                  className="flex min-h-16 min-w-0 flex-1 items-center gap-3 rounded-lg text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                  aria-label={`Ver ficha de ${person.name}`}
                  onClick={() => {
                    setEditingPersonId(person.id)
                    setPersonDialogOpen(true)
                  }}
                >
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-secondary text-secondary-foreground">
                    <UserRound size={18} aria-hidden="true" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{person.name}</span>
                    <span className="mt-0.5 block truncate text-sm text-muted-foreground">
                      {person.phone || "Sin teléfono"}
                    </span>
                    <span className="mt-1 block truncate text-xs text-muted-foreground">
                      {person.firstDay && person.firstHour
                        ? `${person.firstDay} ${person.firstHour}`
                        : "Sin disponibilidad habitual"}
                      {person.secondDay && person.secondHour
                        ? ` · ${person.secondDay} ${person.secondHour}`
                        : ""}
                    </span>
                  </span>
                  <Pencil
                    className="mr-1 shrink-0 text-muted-foreground"
                    size={16}
                    aria-hidden="true"
                  />
                </button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-lg"
                  className="min-h-11 min-w-11 shrink-0"
                  aria-label={`Eliminar a ${person.name}`}
                  onClick={() => setDeletingPersonId(person.id)}
                >
                  <Trash2 data-icon="inline-start" aria-hidden="true" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </section>
      ) : (
        <Empty className="rounded-2xl border border-dashed border-border bg-card px-5 py-9">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              {search ? <Search aria-hidden="true" /> : <UserRound aria-hidden="true" />}
            </EmptyMedia>
            <EmptyTitle>
              {search ? "No encontramos coincidencias" : "Todavía no hay personas"}
            </EmptyTitle>
            <EmptyDescription>
              {search
                ? "Prueba con otro nombre, teléfono o mail."
                : "Agrega personas a mano o importa tu lista desde Excel."}
            </EmptyDescription>
          </EmptyHeader>
          {!search ? (
            <EmptyContent>
              <Button
                type="button"
                size="lg"
                className="min-h-11"
                onClick={() => setPersonDialogOpen(true)}
              >
                <Plus data-icon="inline-start" aria-hidden="true" />
                Agregar primera persona
              </Button>
            </EmptyContent>
          ) : null}
        </Empty>
      )}

      <Card>
        <CardContent className="flex flex-col gap-3 py-4">
          <div className="flex items-start gap-3">
            <FileSpreadsheet className="mt-0.5 shrink-0 text-primary" size={18} aria-hidden="true" />
            <div>
              <p className="font-medium">Exportar lista de personas</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Descarga un archivo .xlsx con las columnas listas para volver a importar.
              </p>
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            size="lg"
            className="min-h-11 w-full"
            disabled={data.people.length === 0}
            onClick={() => void handleExport()}
          >
            <FileSpreadsheet data-icon="inline-start" aria-hidden="true" />
            Exportar personas
          </Button>
        </CardContent>
      </Card>

      <PersonFormDialog
        open={personDialogOpen}
        person={editingPerson}
        onOpenChange={(open) => {
          setPersonDialogOpen(open)
          if (!open) setEditingPersonId(null)
        }}
        onSave={savePerson}
      />

      <ConfirmDialog
        open={Boolean(deletingPerson)}
        onOpenChange={(open) => {
          if (!open) setDeletingPersonId(null)
        }}
        title="Eliminar persona"
        description={
          deletingPerson
            ? `Se eliminará a ${deletingPerson.name}. Sus turnos pasarán a quedar sin cubrir.`
            : "Se eliminará a esta persona."
        }
        confirmLabel="Eliminar persona"
        destructive
        onConfirm={() =>
          deletingPerson ? deletePerson(deletingPerson.id) : Promise.resolve()
        }
      />

      <ExcelImportDialog
        open={importOpen}
        result={importResult}
        summary={importSummary}
        parseError={importError}
        isImporting={isImporting}
        onOpenChange={closeImport}
        onChooseFile={chooseFile}
        onConfirm={handleImport}
      />
    </div>
  )
}
