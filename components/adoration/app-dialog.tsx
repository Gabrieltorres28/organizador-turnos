"use client"

import { useEffect, useId, useRef, type ReactNode } from "react"
import { X } from "lucide-react"
import { Button } from "@/components/ui/button"

type AppDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  children: ReactNode
}

export function AppDialog({
  open,
  onOpenChange,
  title,
  description,
  children,
}: AppDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const id = useId()
  const titleId = `dialog-title-${id}`
  const descriptionId = `dialog-description-${id}`

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return

    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      className="app-dialog fixed inset-x-0 bottom-0 mx-auto mt-auto mb-0 max-h-[min(90dvh,880px)] w-full max-w-md overflow-hidden rounded-t-3xl border border-border bg-card p-0 text-card-foreground shadow-2xl sm:inset-y-0 sm:my-auto sm:rounded-3xl"
      onCancel={(event) => {
        event.preventDefault()
        onOpenChange(false)
      }}
      onClose={() => onOpenChange(false)}
      onClick={(event) => {
        if (event.target === event.currentTarget) onOpenChange(false)
      }}
    >
      <div className="flex max-h-[min(90dvh,880px)] flex-col">
        <header className="flex shrink-0 items-start justify-between gap-4 border-b border-border px-5 py-4 sm:px-6">
          <div className="min-w-0">
            <h2 id={titleId} className="text-lg font-semibold leading-tight">
              {title}
            </h2>
            {description ? (
              <p
                id={descriptionId}
                className="mt-1 text-sm leading-relaxed text-muted-foreground"
              >
                {description}
              </p>
            ) : null}
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon-lg"
            className="min-h-11 min-w-11 shrink-0"
            aria-label="Cerrar ventana"
            onClick={() => onOpenChange(false)}
          >
            <X data-icon="inline-start" aria-hidden="true" />
          </Button>
        </header>
        <div className="overflow-y-auto px-5 py-5 sm:px-6">{children}</div>
      </div>
    </dialog>
  )
}
