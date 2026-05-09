'use client'

import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-browser'
import Image from 'next/image'


const NAV_ITEMS = [
  { href: '/cliente', label: 'Inicio', icon: (active: boolean) => (
    <svg width="22" height="22" fill="none" stroke={active ? 'var(--accent)' : 'currentColor'} strokeWidth={1.8} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
    </svg>
  )},
  { href: '/cliente/prestamos', label: 'Préstamos', icon: (active: boolean) => (
    <svg width="22" height="22" fill="none" stroke={active ? 'var(--accent)' : 'currentColor'} strokeWidth={1.8} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  )},
  { href: '/cliente/pagos', label: 'Historial', icon: (active: boolean) => (
    <svg width="22" height="22" fill="none" stroke={active ? 'var(--accent)' : 'currentColor'} strokeWidth={1.8} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
    </svg>
  )},
]

interface Props {
  children: React.ReactNode
  cliente: { nombre: string; apellido: string }
  currentPath: string
}

export default function ClienteLayout({ children, cliente, currentPath }: Props) {
  const router = useRouter()

  async function logout() {
    await createClient().auth.signOut()
    router.push('/auth/login')
    router.refresh()
  }

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh' }}>

      {/* Sidebar PC */}
      <aside style={{
        position: 'fixed', top: 0, left: 0, bottom: 0, width: 240, zIndex: 40,
        background: '#fff', borderRight: '1px solid var(--border)',
        display: 'flex', flexDirection: 'column', padding: '1.5rem 1rem',
      }} className="pc-sidebar">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: '2.5rem', padding: '0 0.5rem' }}>
        <div style={{ width: 40, height: 40, borderRadius: 10, overflow: 'hidden', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Image src="/logo-leocash.png" alt="Leo Cash" width={40} height={40} style={{ objectFit: 'contain', width: '100%', height: '100%' }} priority />
        </div>
        <div>
            <div style={{ fontWeight: 800, fontSize: 16, color: 'var(--text)', lineHeight: 1.1 }}>Leo Cash</div>
            <div style={{ fontSize: 9, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.09em', fontWeight: 700 }}>Panel Cliente</div>
        </div>
        </div>

        <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
          {NAV_ITEMS.map(item => {
            const active = currentPath === item.href
            return (
              <a key={item.href} href={item.href} style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '0.7rem 0.875rem', borderRadius: 'var(--radius-sm)',
                background: active ? 'var(--accent-dim)' : 'transparent',
                border: active ? '1px solid rgba(0,107,50,0.15)' : '1px solid transparent',
                color: active ? 'var(--accent)' : 'var(--text-2)',
                textDecoration: 'none', fontSize: 14, fontWeight: active ? 700 : 500,
                transition: 'all 0.15s',
              }}>
                {item.icon(active)}
                {item.label}
              </a>
            )
          })}
        </nav>

        <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0.5rem 0.875rem', marginBottom: 8 }}>
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 13, flexShrink: 0 }}>
              {cliente.nombre.charAt(0).toUpperCase()}
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cliente.nombre} {cliente.apellido}</div>
              <div style={{ fontSize: 11, color: 'var(--text-3)' }}>Cliente</div>
            </div>
          </div>
          <button onClick={logout} style={{ width: '100%', padding: '0.5rem', background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text-2)', cursor: 'pointer', fontSize: 12, fontFamily: 'var(--font-body)', fontWeight: 600 }}>
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* Header mobile */}
      <header style={{ position: 'sticky', top: 0, zIndex: 40, background: 'rgba(249,249,255,0.9)', backdropFilter: 'blur(12px)', borderBottom: '1px solid var(--border)', padding: '0 1.25rem', height: 60, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }} className="mobile-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 34, height: 34, borderRadius: 9, background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 }}>
                <Image src="/logo-leocash.png" alt="Leo Cash" width={26} height={26} style={{ objectFit: 'contain' }} priority />
            </div>
            <div>
                <div style={{ fontWeight: 800, fontSize: 15, color: 'var(--text)', lineHeight: 1.1 }}>Leo Cash</div>
                <div style={{ fontSize: 9, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.09em', fontWeight: 700 }}>Panel del cliente</div>
            </div>
        </div>
        <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 13 }}>
          {cliente.nombre.charAt(0).toUpperCase()}
        </div>
      </header>

      {/* Contenido */}
      <main style={{ padding: '1.5rem' }} className="cliente-main">
        {children}
        <div style={{ textAlign: 'center', paddingTop: '1.5rem' }}>
          <p style={{ fontSize: 11, color: 'var(--text-3)' }}>
            Desarrollado por{' '}
            <a href="https://www.devhub.com.ar/" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)', fontWeight: 700, textDecoration: 'none' }}>DevHub</a>
          </p>
        </div>
      </main>

      {/* Nav mobile */}
      <nav style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 40, background: '#fff', borderTop: '1px solid var(--border)', padding: '0.625rem 1.5rem 0.75rem' }} className="mobile-nav">
        <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center', maxWidth: 480, margin: '0 auto' }}>
          {NAV_ITEMS.map(item => {
            const active = currentPath === item.href
            return (
              <a key={item.href} href={item.href} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, textDecoration: 'none', color: active ? 'var(--accent)' : 'var(--text-3)', transition: 'color 0.15s' }}>
                {item.icon(active)}
                <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase' }}>{item.label}</span>
              </a>
            )
          })}
        </div>
      </nav>

      <style>{`
        .pc-sidebar    { display: none !important; }
        .mobile-header { display: flex !important; }
        .mobile-nav    { display: block !important; }
        .cliente-main  { margin-left: 0; padding-bottom: 90px; }

        @media (min-width: 900px) {
          .pc-sidebar    { display: flex !important; }
          .mobile-header { display: none !important; }
          .mobile-nav    { display: none !important; }
          .cliente-main  { margin-left: 240px; padding-bottom: 2rem; max-width: calc(900px + 240px); }
        }
      `}</style>
    </div>
  )
}