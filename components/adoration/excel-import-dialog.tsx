"use client"

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
import { AppDialog } from "@/components/adoration/app-dialog"
import type { ImportParseResult, ImportSummary } from "@/lib/adoration/types"
import { FileSpreadsheet, Upload } from "lucide-react"

type ExcelImportDialogProps = {
  open: boolean
  result: ImportParseResult | null
  summary: ImportSummary | null
  parseError: string
  isImporting: boolean
  onOpenChange: (open: boolean) => void
  onChooseFile: () => void
  onConfirm: () => Promise<void>
}

export function ExcelImportDialog({
  open,
  result,
  summary,
  parseError,
  isImporting,
  onOpenChange,
  onChooseFile,
  onConfirm,
}: ExcelImportDialogProps) {
  const hasMissingColumns = Boolean(result?.missingColumns.length)
  const importCount = result?.records.length ?? 0
  const canImport = Boolean(result && result.records.length > 0 && !hasMissingColumns)

  return (
    <AppDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Importar desde Excel"
      description="La vista previa te permite revisar los datos antes de guardarlos."
    >
      {parseError ? (
        <p
          className="mb-4 rounded-lg bg-destructive/10 px-3 py-3 text-sm text-destructive"
          role="alert"
        >
          {parseError}
        </p>
      ) : null}
      {summary ? (
        <div className="flex flex-col gap-5">
          <Card>
            <CardHeader>
              <Badge variant="secondary" className="w-fit">
                Importación completada
              </Badge>
              <CardTitle className="mt-2 text-lg">Resumen</CardTitle>
              <CardDescription>
                Los cambios ya están guardados en este dispositivo.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-3 gap-2 border-t border-border pt-4">
                <div>
                  <dt className="text-xs text-muted-foreground">Nuevas</dt>
                  <dd className="mt-1 text-xl font-semibold tabular-nums">
                    {summary.created}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Actualizadas</dt>
                  <dd className="mt-1 text-xl font-semibold tabular-nums">
                    {summary.updated}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Con errores</dt>
                  <dd className="mt-1 text-xl font-semibold tabular-nums">
                    {summary.errors}
                  </dd>
                </div>
              </dl>
            </CardContent>
          </Card>
          <Button
            type="button"
            size="lg"
            className="min-h-11 w-full"
            onClick={() => onOpenChange(false)}
          >
            Cerrar
          </Button>
        </div>
      ) : result ? (
        <div className="flex flex-col gap-4">
          {result.missingColumns.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Faltan encabezados</CardTitle>
                <CardDescription>
                  Usa los nombres de columna indicados y vuelve a elegir el archivo.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="flex flex-wrap gap-2">
                  {result.missingColumns.map((column) => (
                    <li key={column}>
                      <Badge variant="destructive">{column}</Badge>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ) : null}

          <div className="grid grid-cols-3 gap-2">
            <Card size="sm">
              <CardContent className="py-2.5">
                <p className="text-xs text-muted-foreground">Filas</p>
                <p className="mt-1 text-lg font-semibold tabular-nums">
                  {result.totalRows}
                </p>
              </CardContent>
            </Card>
            <Card size="sm">
              <CardContent className="py-2.5">
                <p className="text-xs text-muted-foreground">Válidas</p>
                <p className="mt-1 text-lg font-semibold tabular-nums">
                  {result.records.length}
                </p>
              </CardContent>
            </Card>
            <Card size="sm">
              <CardContent className="py-2.5">
                <p className="text-xs text-muted-foreground">Con errores</p>
                <p className="mt-1 text-lg font-semibold tabular-nums">
                  {result.errors.length}
                </p>
              </CardContent>
            </Card>
          </div>

          {result.warnings?.length ? (
            <div className="flex flex-col gap-1 rounded-lg bg-muted px-3 py-3 text-sm text-muted-foreground">
              {result.warnings.map((warning) => (
                <p key={warning}>{warning}</p>
              ))}
            </div>
          ) : null}

          {result.records.length > 0 ? (
            <section aria-labelledby="excel-preview-heading" className="flex flex-col gap-2">
              <div className="flex items-center justify-between gap-2">
                <h3 id="excel-preview-heading" className="text-sm font-semibold">
                  Vista previa
                </h3>
                <span className="text-xs text-muted-foreground">
                  Primeras {Math.min(result.records.length, 4)} personas
                </span>
              </div>
              <div className="flex flex-col gap-2">
                {result.records.slice(0, 4).map((person) => (
                  <Card key={`${person.sourceRow}-${person.name}`} size="sm">
                    <CardContent className="py-3">
                      <p className="truncate font-medium">{person.name}</p>
                      <p className="mt-0.5 truncate text-sm text-muted-foreground">
                        {person.phone || "Sin teléfono"}
                        {person.email ? ` · ${person.email}` : ""}
                      </p>
                      {person.firstDay || person.secondDay ? (
                        <p className="mt-1 text-xs text-muted-foreground">
                          {[person.firstDay && `${person.firstDay} ${person.firstHour}`, person.secondDay && `${person.secondDay} ${person.secondHour}`]
                            .filter(Boolean)
                            .join(" · ")}
                        </p>
                      ) : null}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>
          ) : (
            <Empty className="rounded-xl border border-dashed border-border">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <FileSpreadsheet aria-hidden="true" />
                </EmptyMedia>
                <EmptyTitle>No hay filas listas para importar</EmptyTitle>
                <EmptyDescription>
                  Corrige las filas indicadas o elige otra planilla.
                </EmptyDescription>
              </EmptyHeader>
              <EmptyContent>
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  className="min-h-11"
                  onClick={onChooseFile}
                >
                  <Upload data-icon="inline-start" aria-hidden="true" />
                  Elegir otro archivo
                </Button>
              </EmptyContent>
            </Empty>
          )}

          {result.errors.length > 0 ? (
            <details className="rounded-lg border border-border px-3">
              <summary className="min-h-11 cursor-pointer py-3 text-sm font-medium">
                Ver errores de filas ({result.errors.length})
              </summary>
              <ul className="flex flex-col gap-2 border-t border-border py-3 text-sm text-muted-foreground">
                {result.errors.slice(0, 6).map((error) => (
                  <li key={error}>{error}</li>
                ))}
                {result.errors.length > 6 ? (
                  <li>Y {result.errors.length - 6} errores más.</li>
                ) : null}
              </ul>
            </details>
          ) : null}

          <p className="text-sm text-muted-foreground">
            Si el teléfono ya existe, se actualizará esa persona; si no, se agregará una nueva.
          </p>

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              size="lg"
              className="min-h-11 sm:min-w-28"
              disabled={isImporting}
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              size="lg"
              className="min-h-11 sm:min-w-40"
              disabled={!canImport || isImporting}
              onClick={() => void onConfirm()}
            >
              {isImporting
                ? "Importando…"
                : `Importar ${importCount} ${importCount === 1 ? "persona" : "personas"}`}
            </Button>
          </div>
        </div>
      ) : (
        <Empty className="rounded-xl border border-dashed border-border px-4 py-8">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <FileSpreadsheet aria-hidden="true" />
            </EmptyMedia>
            <EmptyTitle>Elige una planilla Excel</EmptyTitle>
            <EmptyDescription>
              Se buscarán los encabezados por nombre y podrás revisar cada fila antes de importar.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button
              type="button"
              size="lg"
              className="min-h-11"
              onClick={onChooseFile}
            >
              <Upload data-icon="inline-start" aria-hidden="true" />
              Seleccionar archivo .xlsx
            </Button>
          </EmptyContent>
        </Empty>
      )}
    </AppDialog>
  )
}
