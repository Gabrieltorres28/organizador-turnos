"use client"

import { useRef, useState } from "react"
import { toast } from "sonner"
import { AlertTriangle, Archive, FileSpreadsheet, ShieldCheck, Trash2, Upload } from "lucide-react"
import { ConfirmDialog } from "@/components/adoration/confirm-dialog"
import { PwaInstallControl } from "@/components/adoration/pwa-install-control"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { createBackupDocument, parseBackupDocument } from "@/lib/adoration/backup"
import { exportPeopleToExcel } from "@/lib/adoration/excel-import"
import { getLocalDateString } from "@/lib/adoration/dates"
import { removeDemoData } from "@/lib/adoration/seed"
import type { AppData } from "@/lib/adoration/types"

type Commit = (
  update: (current: AppData) => AppData | Promise<AppData>,
) => Promise<AppData>

type SettingsScreenProps = {
  data: AppData
  commit: Commit
  onGoToImport: () => void
}

export function SettingsScreen({ data, commit, onGoToImport }: SettingsScreenProps) {
  const backupInputRef = useRef<HTMLInputElement>(null)
  const [clearDemoOpen, setClearDemoOpen] = useState(false)
  const [restoreCandidate, setRestoreCandidate] = useState<AppData | null>(null)
  const [restoreFileName, setRestoreFileName] = useState("")
  const [isExportingBackup, setIsExportingBackup] = useState(false)
  const [isExportingPeople, setIsExportingPeople] = useState(false)

  const demoCount =
    data.settings.demoIds.people.length +
    data.settings.demoIds.adorations.length +
    data.settings.demoIds.shifts.length
  const hasDemoData = demoCount > 0

  function downloadJson(content: string, filename: string) {
    const blob = new Blob([content], { type: "application/json;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement("a")
    anchor.href = url
    anchor.download = filename
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
    window.setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  async function exportBackup() {
    setIsExportingBackup(true)
    try {
      const document = createBackupDocument(data)
      downloadJson(
        JSON.stringify(document, null, 2),
        `agenda-adoracion-respaldo-${getLocalDateString()}.json`,
      )
      toast.success("Copia de seguridad descargada")
    } catch {
      toast.error("No se pudo crear la copia de seguridad.")
    } finally {
      setIsExportingBackup(false)
    }
  }

  async function exportPeople() {
    setIsExportingPeople(true)
    try {
      await exportPeopleToExcel(data.people)
      toast.success("Archivo de personas descargado")
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "No se pudo exportar la lista de personas.",
      )
    } finally {
      setIsExportingPeople(false)
    }
  }

  async function handleBackupFileChange(
    event: React.ChangeEvent<HTMLInputElement>,
  ) {
    const input = event.currentTarget
    const file = input.files?.[0]
    if (!file) return

    try {
      if (file.size > 10 * 1024 * 1024) {
        throw new Error("La copia supera el límite de 10 MB.")
      }
      const backup = parseBackupDocument(await file.text())
      setRestoreFileName(file.name)
      setRestoreCandidate(backup)
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "No se pudo leer la copia de seguridad.",
      )
    } finally {
      input.value = ""
    }
  }

  async function restoreBackup() {
    if (!restoreCandidate) return
    await commit(() => restoreCandidate)
    setRestoreCandidate(null)
    setRestoreFileName("")
    toast.success("Copia restaurada en este dispositivo")
  }

  async function clearExamples() {
    await commit((current) => removeDemoData(current))
    toast.success("Datos de ejemplo eliminados")
  }

  return (
    <div className="flex flex-col gap-5 px-5 pb-6 pt-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          Preferencias
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">
          Configuración
        </h1>
      </header>

      <Card>
        <CardHeader>
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 shrink-0 text-primary" size={20} aria-hidden="true" />
            <div>
              <CardTitle>Privacidad y almacenamiento</CardTitle>
              <CardDescription className="mt-1">
                La agenda funciona sin cuenta y guarda la información en este dispositivo.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <Badge variant="secondary" className="w-fit">
            Sin cuenta · sin conexión disponible
          </Badge>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Los datos no se envían a un servidor. Haz copias de seguridad si vas a cambiar de teléfono o navegador.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-start gap-3">
            <Archive className="mt-0.5 shrink-0 text-primary" size={20} aria-hidden="true" />
            <div>
              <CardTitle>Copias de seguridad</CardTitle>
              <CardDescription className="mt-1">
                Exporta toda la agenda o restaura una copia anterior.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          <Button
            type="button"
            variant="outline"
            size="lg"
            className="min-h-11 w-full justify-start"
            disabled={isExportingBackup}
            onClick={() => void exportBackup()}
          >
            <Archive data-icon="inline-start" aria-hidden="true" />
            {isExportingBackup ? "Preparando copia…" : "Descargar copia JSON"}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="lg"
            className="min-h-11 w-full justify-start"
            onClick={() => backupInputRef.current?.click()}
          >
            <Upload data-icon="inline-start" aria-hidden="true" />
            Restaurar copia JSON
          </Button>
          <input
            ref={backupInputRef}
            type="file"
            accept=".json,application/json"
            className="sr-only"
            tabIndex={-1}
            aria-label="Seleccionar copia de seguridad JSON"
            onChange={(event) => void handleBackupFileChange(event)}
          />
          <p className="text-xs leading-relaxed text-muted-foreground">
            Restaurar reemplaza las personas, jornadas y turnos actuales. Se solicitará confirmación antes de aplicar la copia.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-start gap-3">
            <FileSpreadsheet className="mt-0.5 shrink-0 text-primary" size={20} aria-hidden="true" />
            <div>
              <CardTitle>Personas y planillas</CardTitle>
              <CardDescription className="mt-1">
                {data.people.length} {data.people.length === 1 ? "persona" : "personas"} guardadas
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          <Button
            type="button"
            variant="outline"
            size="lg"
            className="min-h-11 w-full justify-start"
            onClick={onGoToImport}
          >
            <Upload data-icon="inline-start" aria-hidden="true" />
            Importar desde Excel
          </Button>
          <Button
            type="button"
            variant="outline"
            size="lg"
            className="min-h-11 w-full justify-start"
            disabled={data.people.length === 0 || isExportingPeople}
            onClick={() => void exportPeople()}
          >
            <FileSpreadsheet data-icon="inline-start" aria-hidden="true" />
            {isExportingPeople ? "Preparando archivo…" : "Exportar personas a Excel"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 shrink-0 text-primary" size={20} aria-hidden="true" />
            <div>
              <CardTitle>Datos de demostración</CardTitle>
              <CardDescription className="mt-1">
                Los ejemplos están identificados y se pueden quitar sin borrar tus datos.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {hasDemoData ? (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline">Muestra de ejemplo</Badge>
                <span className="text-sm text-muted-foreground">
                  {data.settings.demoIds.people.length} personas, {data.settings.demoIds.adorations.length} jornadas y {data.settings.demoIds.shifts.length} turnos
                </span>
              </div>
              <Button
                type="button"
                variant="destructive"
                size="lg"
                className="min-h-11 w-full"
                onClick={() => setClearDemoOpen(true)}
              >
                <Trash2 data-icon="inline-start" aria-hidden="true" />
                Eliminar datos de ejemplo
              </Button>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              No quedan datos de demostración. Tus registros se conservan.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Agregar al teléfono</CardTitle>
          <CardDescription>
            Instala la agenda para abrirla desde la pantalla de inicio.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PwaInstallControl />
        </CardContent>
      </Card>

      <p className="pb-1 text-center text-xs text-muted-foreground">
        Agenda de Adoración · versión 1
      </p>

      <ConfirmDialog
        open={clearDemoOpen}
        onOpenChange={setClearDemoOpen}
        title="Eliminar datos de ejemplo"
        description="Se quitarán solamente las personas, jornadas y turnos marcados como demostración. Tus registros propios se conservarán."
        confirmLabel="Eliminar ejemplos"
        destructive
        onConfirm={clearExamples}
      />

      <ConfirmDialog
        open={Boolean(restoreCandidate)}
        onOpenChange={(open) => {
          if (!open) {
            setRestoreCandidate(null)
            setRestoreFileName("")
          }
        }}
        title="Restaurar copia de seguridad"
        description={`La copia ${restoreFileName ? `“${restoreFileName}”` : "seleccionada"} reemplazará los datos actuales por ${restoreCandidate?.people.length ?? 0} personas, ${restoreCandidate?.adorations.length ?? 0} jornadas y ${restoreCandidate?.shifts.length ?? 0} turnos. Esta acción no se puede deshacer.`}
        confirmLabel="Restaurar copia"
        destructive
        onConfirm={restoreBackup}
      />
    </div>
  )
}
