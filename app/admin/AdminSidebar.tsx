'use client'

import { useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-browser'
import type { Perfil } from '@/types'

const NAV = [
  { href: '/admin',          label: 'Dashboard',   icon: '◈' },
  { href: '/admin/clientes', label: 'Clientes',     icon: '◎' },
  { href: '/admin/prestamos',label: 'Préstamos',    icon: '◇' },
  { href: '/admin/pagos',    label: 'Pagos',        icon: '◉' },
  { href: '/admin/reportes', label: 'Reportes',     icon: '▦' },
]

export default function AdminSidebar({ perfil }: { perfil: Perfil }) {
  const pathname = usePathname()
  const router = useRouter()
  const [open, setOpen] = useState(false)

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/auth/login')
    router.refresh()
  }

  const isActive = (href: string) =>
    href === '/admin' ? pathname === '/admin' : pathname.startsWith(href)

  return (
    <>
      {/* Mobile top bar */}
      <div style={{
        display: 'none',
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50,
        background: 'var(--bg-2)', borderBottom: '1px solid var(--border)',
        padding: '0.75rem 1rem',
        alignItems: 'center', justifyContent: 'space-between',
      }} className="mobile-bar">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 28, height: 28, borderRadius: 7,
            background: 'linear-gradient(135deg, var(--accent), var(--accent-light))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 14, color: '#fff', fontWeight: 700,
          }}>₿</div>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: 18 }}>DevHub Cobros</span>
        </div>
        <button onClick={() => setOpen(!open)} style={{
          background: 'none', border: 'none', cursor: 'pointer',
          color: 'var(--text)', fontSize: 20, padding: 4,
        }}>☰</button>
      </div>

      {/* Sidebar */}
      <aside style={{
        width: 220,
        background: 'var(--bg-2)',
        borderRight: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        position: 'sticky',
        top: 0,
        height: '100vh',
        flexShrink: 0,
        zIndex: 40,
      }}>
        {/* Logo */}
        <div style={{
          padding: '1.5rem 1.25rem',
          borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <div style={{
            width: 34, height: 34, borderRadius: 9,
            background: 'linear-gradient(135deg, var(--accent) 0%, var(--accent-light) 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 17, color: '#fff', fontWeight: 700,
            boxShadow: '0 3px 12px rgba(99,102,241,0.35)',
          }}>₿</div>
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 17, lineHeight: 1.1 }}>DevHub</div>
            <div style={{ fontSize: 10, color: 'var(--text-3)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Cobros</div>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '0.75rem 0.625rem', display: 'flex', flexDirection: 'column', gap: 2 }}>
          {NAV.map(item => (
            <a
              key={item.href}
              href={item.href}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '0.6rem 0.875rem',
                borderRadius: 'var(--radius-sm)',
                background: isActive(item.href) ? 'var(--accent-dim)' : 'transparent',
                color: isActive(item.href) ? 'var(--accent-light)' : 'var(--text-2)',
                border: isActive(item.href) ? '1px solid rgba(99,102,241,0.2)' : '1px solid transparent',
                textDecoration: 'none', fontSize: 14,
                transition: 'all 0.15s',
                fontWeight: isActive(item.href) ? 500 : 400,
              }}
            >
              <span style={{ fontSize: 15, width: 18, textAlign: 'center', lineHeight: 1 }}>{item.icon}</span>
              {item.label}
            </a>
          ))}
        </nav>

        {/* User */}
        <div style={{
          padding: '1rem 1.25rem',
          borderTop: '1px solid var(--border)',
        }}>
          <div style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 13, color: 'var(--text)', fontWeight: 500, lineHeight: 1.3 }}>
              {perfil.nombre}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{perfil.email}</div>
          </div>
          <button onClick={handleLogout} style={{
            width: '100%', padding: '0.5rem',
            background: 'var(--bg-3)', border: '1px solid var(--border)',
            borderRadius: 'var(--radius-sm)', color: 'var(--text-2)',
            fontSize: 12, cursor: 'pointer', fontFamily: 'var(--font-body)',
            transition: 'all 0.15s',
          }}
          onMouseOver={e => { (e.target as HTMLElement).style.color = 'var(--red)'; (e.target as HTMLElement).style.borderColor = 'rgba(239,68,68,0.3)' }}
          onMouseOut={e => { (e.target as HTMLElement).style.color = 'var(--text-2)'; (e.target as HTMLElement).style.borderColor = 'var(--border)' }}
          >
            Cerrar sesión
          </button>
        </div>
      </aside>

      <style>{`
        @media (max-width: 768px) {
          .mobile-bar { display: flex !important; }
          aside { display: ${open ? 'flex' : 'none'} !important; position: fixed !important; top: 53px !important; height: calc(100vh - 53px) !important; }
          main { margin-top: 53px !important; }
        }
      `}</style>
    </>
  )
}
