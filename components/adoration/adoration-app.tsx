"use client"

import { useCallback, useState } from "react"
import {
  CalendarDays,
  Church,
  LoaderCircle,
  Settings,
  UsersRound,
  type LucideIcon,
} from "lucide-react"
import { AgendaScreen } from "@/components/adoration/agenda-screen"
import { PeopleScreen } from "@/components/adoration/people-screen"
import { SettingsScreen } from "@/components/adoration/settings-screen"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useAdorationData } from "@/lib/adoration/use-adoration-data"

type Section = "agenda" | "personas" | "configuracion"
type NavigationItem = {
  id: Section
  label: string
  icon: LucideIcon
}

const navigationItems: NavigationItem[] = [
  { id: "agenda", label: "Agenda", icon: CalendarDays },
  { id: "personas", label: "Personas", icon: UsersRound },
  { id: "configuracion", label: "Configuración", icon: Settings },
]

export function AdorationApp() {
  const { data, error, isLoading, commit, retry } = useAdorationData()
  const [section, setSection] = useState<Section>("agenda")
  const [autoOpenImport, setAutoOpenImport] = useState(false)
  const handleImportHandled = useCallback(() => setAutoOpenImport(false), [])

  function goToImport() {
    setAutoOpenImport(true)
    setSection("personas")
  }

  return (
    <div className="min-h-dvh bg-muted/60">
      <div className="mx-auto min-h-dvh w-full max-w-md overflow-x-hidden border-x border-border bg-background shadow-xl">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-background focus:px-4 focus:py-3 focus:text-foreground focus:shadow-lg"
        >
          Saltar al contenido
        </a>

        <header className="flex items-center gap-3 border-b border-border/70 px-5 pb-4 pt-[max(1.25rem,env(safe-area-inset-top))]">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Church size={20} aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Adoración al Santísimo
            </p>
            <p className="truncate text-base font-semibold tracking-tight">
              Agenda de Adoración
            </p>
          </div>
        </header>

        <main id="main-content" className="pb-28">
          {isLoading ? (
            <div className="flex min-h-[55dvh] flex-col items-center justify-center gap-3 px-6 text-center">
              <LoaderCircle
                className="animate-spin text-primary"
                size={28}
                aria-hidden="true"
              />
              <p className="text-sm text-muted-foreground" role="status">
                Preparando tu agenda…
              </p>
            </div>
          ) : error ? (
            <div className="px-5 py-10">
              <Card>
                <CardHeader>
                  <CardTitle>No pudimos abrir los datos</CardTitle>
                  <CardDescription>
                    Revisa el almacenamiento disponible en este dispositivo y vuelve a intentarlo.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button
                    type="button"
                    size="lg"
                    className="min-h-11 w-full"
                    onClick={() => void retry()}
                  >
                    Volver a intentar
                  </Button>
                </CardContent>
              </Card>
            </div>
          ) : data ? (
            section === "agenda" ? (
              <AgendaScreen data={data} commit={commit} />
            ) : section === "personas" ? (
              <PeopleScreen
                data={data}
                commit={commit}
                autoOpenImport={autoOpenImport}
                onImportHandled={handleImportHandled}
              />
            ) : (
              <SettingsScreen
                data={data}
                commit={commit}
                onGoToImport={goToImport}
              />
            )
          ) : null}
        </main>

        <nav
          aria-label="Navegación principal"
          className="fixed bottom-0 left-1/2 z-20 flex w-full max-w-md -translate-x-1/2 items-center gap-1 border-t border-border bg-background/95 px-3 pt-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] shadow-[0_-8px_24px_-20px_oklch(0.2_0.02_245/0.5)] backdrop-blur"
        >
          {navigationItems.map(({ id, label, icon: Icon }) => {
            const selected = section === id
            return (
              <button
                key={id}
                type="button"
                aria-current={selected ? "page" : undefined}
                className={cn(
                  "flex min-h-14 flex-1 flex-col items-center justify-center gap-1 rounded-xl px-2 text-xs font-medium outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/50",
                  selected
                    ? "bg-secondary text-secondary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
                onClick={() => setSection(id)}
              >
                <Icon className="size-5" aria-hidden="true" />
                <span>{label}</span>
              </button>
            )
          })}
        </nav>
      </div>
    </div>
  )
}
