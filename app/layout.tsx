import type { Metadata } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: "Territory Management System",
  description: "Manage client territories and event scheduling",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
