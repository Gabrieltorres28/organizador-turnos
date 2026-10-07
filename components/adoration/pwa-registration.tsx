"use client"

import { useEffect } from "react"

export function PwaRegistration() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) {
      return
    }

    void navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {
      // Offline caching is optional until the next successful registration.
    })
  }, [])

  return null
}
