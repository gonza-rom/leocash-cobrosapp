'use client'

import { useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-browser'
import Image from 'next/image'
import Link from 'next/link'
import type { Perfil } from '@/types'

const NAV = [
  { href: '/admin', label: 'Dashboard', icon: (active: boolean) => (
    <svg width="20" height="20" fill="none" stroke={active ? 'var(--accent)' : 'currentColor'} strokeWidth={1.8} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
    </svg>
  )},
  { href: '/admin/clientes', label: 'Clientes', icon: (active: boolean) => (
    <svg width="20" height="20" fill="none" stroke={active ? 'var(--accent)' : 'currentColor'} strokeWidth={1.8} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  )},
  { href: '/admin/prestamos', label: 'Préstamos', icon: (active: boolean) => (
    <svg width="20" height="20" fill="none" stroke={active ? 'var(--accent)' : 'currentColor'} strokeWidth={1.8} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  )},
  { href: '/admin/pagos', label: 'Pagos', icon: (active: boolean) => (
    <svg width="20" height="20" fill="none" stroke={active ? 'var(--accent)' : 'currentColor'} strokeWidth={1.8} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
    </svg>
  )},
  { href: '/admin/reportes', label: 'Reportes', icon: (active: boolean) => (
    <svg width="20" height="20" fill="none" stroke={active ? 'var(--accent)' : 'currentColor'} strokeWidth={1.8} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  )},
  { href: '/admin/puntos', label: 'Puntos', icon: (active: boolean) => (
    <svg width="20" height="20" fill="none" stroke={active ? 'var(--accent)' : 'currentColor'} strokeWidth={1.8} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
    </svg>
  )},
  { href: '/admin/cobranzas', label: 'Cobranzas', icon: (active: boolean) => (
    <svg width="20" height="20" fill="none" stroke={active ? 'var(--accent)' : 'currentColor'} strokeWidth={1.8} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  )},
]

export default function AdminSidebar({ perfil }: { perfil: Perfil }) {
  const pathname = usePathname()
  const router = useRouter()

  async function handleLogout() {
    await createClient().auth.signOut()
    router.push('/auth/login')
    router.refresh()
  }

  const isActive = (href: string) =>
    href === '/admin' ? pathname === '/admin' : pathname.startsWith(href)

  const linkStyle = (active: boolean) => ({
    display: 'flex', alignItems: 'center', gap: 12,
    padding: '0.7rem 0.875rem', borderRadius: 'var(--radius-sm)',
    background: active ? 'var(--accent-dim)' : 'transparent',
    border: active ? '1px solid rgba(0,107,50,0.15)' : '1px solid transparent',
    color: active ? 'var(--accent)' : 'var(--text-2)',
    textDecoration: 'none', fontSize: 14, fontWeight: active ? 700 : 500,
    transition: 'all 0.15s',
  } as const)

  const bottomLinkStyle = (active: boolean) => ({
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
    textDecoration: 'none',
    color: active ? 'var(--accent)' : 'var(--text-3)',
    transition: 'color 0.15s', minWidth: 48, padding: '2px 0',
  } as const)

  return (
    <>
      {/* ── SIDEBAR PC ── */}
      <aside className="admin-pc-sidebar" style={{
        position: 'fixed', top: 0, left: 0, bottom: 0, width: 240, zIndex: 40,
        background: '#fff', borderRight: '1px solid var(--border)',
        display: 'flex', flexDirection: 'column', padding: '1.5rem 1rem',
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: '2rem', padding: '0 0.5rem' }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, overflow: 'hidden', flexShrink: 0 }}>
            <Image src="/logo-leocash.png" alt="Leo Cash" width={40} height={40} style={{ objectFit: 'contain', width: '100%', height: '100%' }} priority />
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 16, color: 'var(--text)', lineHeight: 1.1 }}>Leo Cash</div>
            <div style={{ fontSize: 9, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.09em', fontWeight: 700 }}>Administrador</div>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
          {NAV.map(item => {
            const active = isActive(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                prefetch={true}
                style={linkStyle(active)}
                onMouseOver={e => { if (!active) (e.currentTarget as HTMLElement).style.background = 'var(--bg-2)' }}
                onMouseOut={e => { if (!active) (e.currentTarget as HTMLElement).style.background = 'transparent' }}
              >
                {item.icon(active)}
                {item.label}
              </Link>
            )
          })}
        </nav>

        {/* User */}
        <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0.5rem 0.875rem', marginBottom: 8 }}>
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 13, flexShrink: 0 }}>
              {perfil.nombre.charAt(0).toUpperCase()}
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{perfil.nombre}</div>
              <div style={{ fontSize: 11, color: 'var(--text-3)' }}>Admin</div>
            </div>
          </div>
          <button
            onClick={handleLogout}
            style={{ width: '100%', padding: '0.5rem', background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text-2)', cursor: 'pointer', fontSize: 12, fontFamily: 'var(--font-body)', fontWeight: 600, transition: 'all 0.15s' }}
            onMouseOver={e => { (e.currentTarget as HTMLElement).style.color = 'var(--red)'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(186,26,26,0.3)' }}
            onMouseOut={e => { (e.currentTarget as HTMLElement).style.color = 'var(--text-2)'; (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)' }}
          >
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* ── HEADER MOBILE ── */}
      <header className="admin-mobile-header" style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50,
        background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(12px)',
        borderBottom: '1px solid var(--border)',
        height: 56, padding: '0 1.25rem',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 34, height: 34, borderRadius: 9, overflow: 'hidden', flexShrink: 0 }}>
            <Image src="/logo-leocash.png" alt="Leo Cash" width={34} height={34} style={{ objectFit: 'contain', width: '100%', height: '100%' }} priority />
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 15, color: 'var(--text)', lineHeight: 1.1 }}>Leo Cash</div>
            <div style={{ fontSize: 9, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.09em', fontWeight: 700 }}>Administrador</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 13 }}>
            {perfil.nombre.charAt(0).toUpperCase()}
          </div>
          <button
            onClick={handleLogout}
            style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '0.3rem 0.75rem', color: 'var(--text-3)', cursor: 'pointer', fontSize: 11, fontFamily: 'var(--font-body)', fontWeight: 700 }}
          >
            Salir
          </button>
        </div>
      </header>

      {/* ── NAV BOTTOM MOBILE ── */}
      <nav className="admin-mobile-nav" style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 40,
        background: '#fff', borderTop: '1px solid var(--border)',
        padding: '0.5rem 0.25rem 0.75rem',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center' }}>
          {NAV.map(item => {
            const active = isActive(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                prefetch={true}
                style={bottomLinkStyle(active)}
              >
                {item.icon(active)}
                <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                  {item.label}
                </span>
              </Link>
            )
          })}
        </div>
      </nav>

      <style>{`
        .admin-pc-sidebar    { display: none !important; }
        .admin-mobile-header { display: flex !important; }
        .admin-mobile-nav    { display: block !important; }

        @media (min-width: 900px) {
          .admin-pc-sidebar    { display: flex !important; }
          .admin-mobile-header { display: none !important; }
          .admin-mobile-nav    { display: none !important; }
        }
      `}</style>
    </>
  )
}