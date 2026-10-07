import type { Metadata, Viewport } from "next"
import { Toaster } from "@/components/ui/sonner"
import { PwaRegistration } from "@/components/adoration/pwa-registration"
import "./globals.css"

export const metadata: Metadata = {
  title: "Agenda de Adoración",
  description:
    "Organiza jornadas de adoración, turnos y disponibilidad de personas, incluso sin conexión.",
  applicationName: "Agenda de Adoración",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Adoración",
  },
  icons: {
    icon: [
      { url: "/icon-192.png", type: "image/png", sizes: "192x192" },
      { url: "/icon-512.png", type: "image/png", sizes: "512x512" },
    ],
    apple: [{ url: "/icon-192.png", type: "image/png", sizes: "192x192" }],
  },
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  colorScheme: "light",
  themeColor: "#f6f8f4",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="es" className="light">
      <body className="antialiased">
        <PwaRegistration />
        {children}
        <Toaster theme="light" position="top-center" />
      </body>
    </html>
  )
}
