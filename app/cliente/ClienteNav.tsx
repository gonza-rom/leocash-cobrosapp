'use client'

import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-browser'

export default function ClienteNav({ perfil, cliente }: { perfil: any; cliente: any }) {
  const pathname = usePathname()
  const router = useRouter()

  async function logout() {
    await createClient().auth.signOut()
    router.push('/auth/login')
    router.refresh()
  }

  const links = [
    { href: '/cliente',           label: 'Mi cuenta' },
    { href: '/cliente/prestamos', label: 'Préstamos' },
    { href: '/cliente/pagos',     label: 'Pagos' },
  ]

  return (
    <nav style={{
      background: 'var(--bg-2)', borderBottom: '1px solid var(--border)',
      padding: '0 1rem', position: 'sticky', top: 0, zIndex: 50,
    }}>
      <div style={{ maxWidth: 800, margin: '0 auto', display: 'flex', alignItems: 'center', gap: '1.5rem', height: 52 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginRight: 8 }}>
          <div style={{ width: 26, height: 26, borderRadius: 7, background: 'linear-gradient(135deg, var(--accent), var(--accent-light))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, color: '#fff', fontWeight: 700 }}>₿</div>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: 15 }}>DevHub Cobros</span>
        </div>
        {links.map(l => (
          <a key={l.href} href={l.href} style={{
            fontSize: 13, textDecoration: 'none',
            color: pathname === l.href ? 'var(--text)' : 'var(--text-3)',
            borderBottom: pathname === l.href ? '2px solid var(--accent)' : '2px solid transparent',
            paddingBottom: 2, transition: 'all 0.15s',
          }}>{l.label}</a>
        ))}
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span style={{ fontSize: 12, color: 'var(--text-3)' }}>{cliente.nombre} {cliente.apellido}</span>
          <button onClick={logout} style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '0.3rem 0.75rem', color: 'var(--text-3)', cursor: 'pointer', fontSize: 12, fontFamily: 'var(--font-body)' }}>
            Salir
          </button>
        </div>
      </div>
    </nav>
  )
}
