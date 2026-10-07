"use client"

import { useEffect, useState } from "react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Download } from "lucide-react"

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>
}

export function PwaInstallControl() {
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null)
  const [isInstalled, setIsInstalled] = useState(false)
  const [isAppleMobile, setIsAppleMobile] = useState(false)

  useEffect(() => {
    const displayMode = window.matchMedia("(display-mode: standalone)")
    const standaloneNavigator = navigator as Navigator & { standalone?: boolean }
    setIsInstalled(displayMode.matches || standaloneNavigator.standalone === true)
    setIsAppleMobile(/iphone|ipad|ipod/i.test(navigator.userAgent))

    function handleBeforeInstallPrompt(event: Event) {
      event.preventDefault()
      setInstallPrompt(event as InstallPromptEvent)
    }

    function handleInstalled() {
      setIsInstalled(true)
      setInstallPrompt(null)
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt)
    window.addEventListener("appinstalled", handleInstalled)
    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt)
      window.removeEventListener("appinstalled", handleInstalled)
    }
  }, [])

  async function installApp() {
    if (!installPrompt) return
    try {
      await installPrompt.prompt()
      const choice = await installPrompt.userChoice
      if (choice.outcome === "accepted") setIsInstalled(true)
      setInstallPrompt(null)
    } catch {
      toast.error("No se pudo iniciar la instalación desde este navegador.")
    }
  }

  if (isInstalled) {
    return <Badge variant="secondary">Aplicación instalada</Badge>
  }

  if (installPrompt) {
    return (
      <Button
        type="button"
        size="lg"
        className="min-h-11 w-full"
        onClick={() => void installApp()}
      >
        <Download data-icon="inline-start" aria-hidden="true" />
        Instalar aplicación
      </Button>
    )
  }

  return (
    <p className="text-sm leading-relaxed text-muted-foreground">
      {isAppleMobile
        ? "En iPhone o iPad, abre esta página en Safari, toca Compartir y elige Agregar a pantalla de inicio."
        : "En el menú del navegador, elige Instalar aplicación o Agregar a pantalla de inicio para usarla como app."}
    </p>
  )
}
