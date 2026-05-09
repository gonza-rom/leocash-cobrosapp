import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'DevHub Cobros',
  description: 'Sistema de gestión de cobros y préstamos',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  )
}
