"use client"

import { useCallback, useRef } from "react"
import useSWR from "swr"
import { createDemoData } from "@/lib/adoration/seed"
import { adorationRepository } from "@/lib/adoration/repository"
import type { AppData } from "@/lib/adoration/types"

const APP_DATA_KEY = "agenda-adoracion-app-data-v1"

async function loadOrCreateData(): Promise<AppData> {
  const savedData = await adorationRepository.load()
  if (savedData) return savedData

  const demoData = createDemoData()
  await adorationRepository.save(demoData)
  return demoData
}

export function useAdorationData() {
  const { data, error, isLoading, mutate } = useSWR<AppData>(
    APP_DATA_KEY,
    loadOrCreateData,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      shouldRetryOnError: false,
    },
  )
  const latestData = useRef<AppData | null>(null)
  const mutationQueue = useRef<Promise<void>>(Promise.resolve())

  if (data) latestData.current = data

  const commit = useCallback(
    (update: (current: AppData) => AppData | Promise<AppData>) => {
      const operation = mutationQueue.current.then(async () => {
        const current = latestData.current
        if (!current) throw new Error("Los datos todavía se están cargando.")

        const next = await update(current)
        await adorationRepository.save(next)
        latestData.current = next
        await mutate(next, { revalidate: false })
        return next
      })

      mutationQueue.current = operation.then(
        () => undefined,
        () => undefined,
      )
      return operation
    },
    [mutate],
  )

  const retry = useCallback(() => mutate(), [mutate])

  return {
    data,
    error,
    isLoading,
    commit,
    retry,
  }
}
