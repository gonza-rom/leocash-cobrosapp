import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Leo Cash',
  description: 'Sistema de gestión de cobros y préstamos',
  openGraph: {
    title: 'Leo Cash',
    description: 'Sistema de gestión de cobros y préstamos',
    images: [{ url: '/logo-leocash.png', width: 512, height: 512, alt: 'Leo Cash' }],
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: 'Leo Cash',
    description: 'Sistema de gestión de cobros y préstamos',
    images: ['/logo-leocash.png'],
  },
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/logo-leocash.png', type: 'image/png', sizes: '512x512' },
    ],
    apple: '/logo-leocash.png',
    shortcut: '/favicon.ico',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  )
}