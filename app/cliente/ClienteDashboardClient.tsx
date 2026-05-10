'use client'

import { useRouter } from 'next/navigation'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase-browser'
import Image from 'next/image'

const fmt = (n: number) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n)

interface DashboardData {
  cliente: { nombre: string; apellido: string }
  deudaTotal: number
  totalPrestado: number
  totalPagado: number
  pct: number
  cuotasTotales: number
  cuotasPagadas: number
  proximoVencimiento: string | null
  proximoDescripcion: string | null
  pagos: { id: string; monto: number; fechaPago: string; descripcion: string }[]
  prestamosActivos: number
  puntaje: { puntos_actual: number; estado: string } | null
}

const NAV_ITEMS = [
  { href: '/cliente', label: 'Inicio', icon: (active: boolean) => (
    <svg width="22" height="22" fill={active ? 'var(--accent)' : 'none'} stroke={active ? 'var(--accent)' : 'currentColor'} strokeWidth={1.8} viewBox="0 0 24 24">
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

export default function ClienteDashboardClient({ data }: { data: DashboardData }) {
  const pathname = usePathname()
  const router = useRouter()

  async function logout() {
    await createClient().auth.signOut()
    router.push('/auth/login')
    router.refresh()
  }

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh' }}>

      {/* ── SIDEBAR PC ── */}
      <aside style={{
        position: 'fixed', top: 0, left: 0, bottom: 0,
        width: 240, zIndex: 40,
        background: '#fff',
        borderRight: '1px solid var(--border)',
        display: 'flex', flexDirection: 'column',
        padding: '1.5rem 1rem',
      }} className="pc-sidebar">
        {/* Logo */}        
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: '2.5rem', padding: '0 0.5rem' }}>
            <div style={{ width: 70, height: 70, borderRadius: 10, overflow: 'hidden', flexShrink: 0 }}>
                <Image src="/logo-leocash.png" alt="Leo Cash" width={40} height={40} style={{ objectFit: 'contain', width: '100%', height: '100%' }} priority />
            </div>
        <div>
            <div style={{ fontWeight: 800, fontSize: 16, color: 'var(--text)', lineHeight: 1.1 }}>Leo Cash</div>
            <div style={{ fontSize: 9, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.09em', fontWeight: 700 }}>Panel Cliente</div>
        </div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
          {NAV_ITEMS.map(item => {
            const active = pathname === item.href
            return (
              <a key={item.href} href={item.href} style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '0.7rem 0.875rem',
                borderRadius: 'var(--radius-sm)',
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

        {/* User */}
        <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0.5rem 0.875rem', marginBottom: 8 }}>
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 13, flexShrink: 0 }}>
              {data.cliente.nombre.charAt(0).toUpperCase()}
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{data.cliente.nombre} {data.cliente.apellido}</div>
              <div style={{ fontSize: 11, color: 'var(--text-3)' }}>Cliente</div>
            </div>
          </div>
          <button onClick={logout} style={{ width: '100%', padding: '0.5rem', background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text-2)', cursor: 'pointer', fontSize: 12, fontFamily: 'var(--font-body)', fontWeight: 600 }}>
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* ── HEADER MOBILE ── */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 40,
        background: 'rgba(249,249,255,0.9)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid var(--border)',
        padding: '0 1.25rem', height: 60,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }} className="mobile-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 64, height: 64, borderRadius: 9, overflow: 'hidden', flexShrink: 0 }}>
            <Image src="/logo-leocash.png" alt="Leo Cash" width={36} height={36} style={{ objectFit: 'contain', width: '100%', height: '100%' }} priority />
        </div>
        <div>
            <div style={{ fontWeight: 800, fontSize: 15, color: 'var(--text)', lineHeight: 1.1 }}>Leo Cash</div>
            <div style={{ fontSize: 9, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.09em', fontWeight: 700 }}>Panel del cliente</div>
        </div>
        </div>
        <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 13 }}>
          {data.cliente.nombre.charAt(0).toUpperCase()}
        </div>
      </header>

      {/* ── CONTENIDO ── */}
      <main style={{ paddingBottom: 90 }} className="cliente-main">
        <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

          {/* Saludo */}
          <section>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 28, color: 'var(--text)', letterSpacing: '-0.02em', marginBottom: 4 }}>
              ¡Hola, {data.cliente.nombre}!
            </h2>
            <p style={{ color: 'var(--text-2)', fontSize: 14 }}>Aquí tenés el resumen de tu cuenta.</p>
          </section>

          {/* Grid PC: 2 col / Mobile: 1 col */}
          <div className="dashboard-grid">

            {/* Card deuda principal */}
            <div style={{
              background: 'var(--accent)', borderRadius: 'var(--radius-lg)',
              padding: '1.75rem', position: 'relative', overflow: 'hidden',
              boxShadow: '0 8px 32px var(--accent-dim)',
            }}>
              <div style={{ position: 'absolute', top: -40, right: -40, width: 160, height: 160, borderRadius: '50%', background: 'rgba(255,255,255,0.07)' }} />
              <div style={{ position: 'absolute', bottom: -30, left: -20, width: 120, height: 120, borderRadius: '50%', background: 'rgba(255,255,255,0.05)' }} />
              <div style={{ position: 'relative', zIndex: 1 }}>
                <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700 }}>
                  {data.deudaTotal > 0 ? 'Saldo Restante' : 'Estado de Cuenta'}
                </span>
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: 40, color: '#fff', marginTop: 6, letterSpacing: '-0.02em', fontWeight: 700, lineHeight: 1 }}>
                  {fmt(data.deudaTotal)}
                </p>
                {data.deudaTotal === 0 && <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.85)', marginTop: 6, display: 'block' }}>✓ Al día</span>}

                <div style={{ borderTop: '1px solid rgba(255,255,255,0.15)', paddingTop: '1.25rem', marginTop: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                  <div>
                    <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.65)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700 }}>Deuda Total</span>
                    <p style={{ fontFamily: 'var(--font-mono)', fontSize: 20, color: '#fff', marginTop: 2, fontWeight: 600 }}>{fmt(data.totalPrestado)}</p>
                  </div>
                  {data.proximoVencimiento && (
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.65)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700 }}>Próx. Vencimiento</span>
                      <p style={{ fontFamily: 'var(--font-mono)', fontSize: 14, color: 'rgba(255,255,255,0.9)', marginTop: 2, fontWeight: 600 }}>
                        {new Date(data.proximoVencimiento).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Progreso */}
            <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '1.5rem', boxShadow: 'var(--shadow-sm)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>Progreso del Cobro</h3>
                <span style={{ fontSize: 11, fontWeight: 700, background: 'var(--accent-dim)', color: 'var(--accent)', padding: '4px 10px', borderRadius: 20 }}>
                  {data.cuotasPagadas} de {data.cuotasTotales} cuotas
                </span>
              </div>
              <div style={{ height: 12, background: 'var(--bg-3)', borderRadius: 6, overflow: 'hidden', border: '1px solid var(--border)', marginBottom: '1rem' }}>
                <div style={{ height: '100%', width: `${data.pct}%`, background: 'linear-gradient(90deg, var(--accent), var(--accent-light))', borderRadius: 6, transition: 'width 0.5s ease' }} />
              </div>

              {/* Stats */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                {[
                  { label: 'Pagado', value: fmt(data.totalPagado), color: 'var(--accent)' },
                  { label: 'Pendiente', value: fmt(data.deudaTotal), color: 'var(--amber)' },
                  { label: 'Progreso', value: `${data.pct}%`, color: 'var(--text)' },
                ].map(s => (
                  <div key={s.label} style={{ background: 'var(--bg-2)', borderRadius: 'var(--radius-sm)', padding: '0.625rem', textAlign: 'center' }}>
                    <div style={{ fontSize: 10, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700, marginBottom: 4 }}>{s.label}</div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: s.color, fontWeight: 700 }}>{s.value}</div>
                  </div>
                ))}
              </div>
            </div>
            {/* Score LeoCash */}
            {data.puntaje && (() => {
              const ESTADOS: Record<string, { label: string; color: string; bg: string; accion: string }> = {
                vip:         { label: '⭐ VIP',             color: 'var(--accent)',  bg: 'var(--accent-dim)',    accion: 'Podés solicitar hasta 50% más de crédito' },
                cumplidor:   { label: '✓ Cumplidor',        color: '#0ea5e9',        bg: 'rgba(14,165,233,0.1)', accion: 'Podés renovar el mismo monto' },
                observacion: { label: '⚠ En Observación',  color: 'var(--amber)',   bg: 'var(--amber-dim)',     accion: 'Renovación sin aumento de monto' },
                moroso:      { label: '✗ Moroso',           color: 'var(--red)',     bg: 'var(--red-dim)',       accion: 'No se otorgan nuevos créditos' },
                bloqueado:   { label: '🔒 Bloqueado',       color: '#7c3aed',        bg: 'rgba(124,58,237,0.1)', accion: 'Cuenta bloqueada por mora' },
              }
              const cfg = ESTADOS[data.puntaje!.estado] ?? ESTADOS.cumplidor
              const pct = Math.min(100, Math.round((data.puntaje!.puntos_actual / 200) * 100))

              return (
                <section style={{
                  background: '#fff',
                  border: `1.5px solid ${cfg.color}`,
                  borderRadius: 'var(--radius-lg)',
                  padding: '1.25rem',
                  boxShadow: 'var(--shadow-sm)',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                    <div>
                      <div style={{ fontSize: 11, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700, marginBottom: 6 }}>
                        Score LeoCash
                      </div>
                      <span style={{ padding: '0.3rem 0.875rem', borderRadius: 20, fontSize: 12, fontWeight: 700, background: cfg.bg, color: cfg.color }}>
                        {cfg.label}
                      </span>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 32, color: cfg.color, fontWeight: 700, lineHeight: 1 }}>
                        {data.puntaje!.puntos_actual}
                      </div>
                      <div style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 2 }}>puntos</div>
                    </div>
                  </div>
                  <div style={{ height: 8, background: 'var(--bg-3)', borderRadius: 4, overflow: 'hidden', marginBottom: 8, border: '1px solid var(--border)' }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: cfg.color, borderRadius: 4, transition: 'width 0.5s ease' }} />
                  </div>
                  <p style={{ fontSize: 12, color: 'var(--text-2)', lineHeight: 1.5 }}>{cfg.accion}</p>
                </section>
              )
            })()}
          </div>

          {/* Acciones */}
          <section>
            <h3 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '0.75rem' }}>Acciones rápidas</h3>
            <div className="acciones-grid">
              <a href="/cliente/prestamos" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, padding: '1rem', background: 'var(--accent)', color: '#fff', borderRadius: 'var(--radius)', textDecoration: 'none', fontWeight: 700, fontSize: 15, boxShadow: '0 4px 16px var(--accent-dim)' }}>
                <svg width="18" height="18" fill="white" viewBox="0 0 24 24"><path d="M11.8 10.9c-2.27-.59-3-1.2-3-2.15 0-1.09 1.01-1.85 2.7-1.85 1.78 0 2.44.85 2.5 2.1h2.21c-.07-1.72-1.12-3.3-3.21-3.81V3h-3v2.16c-1.94.42-3.5 1.68-3.5 3.61 0 2.31 1.91 3.46 4.7 4.13 2.5.6 3 1.48 3 2.41 0 .69-.49 1.79-2.7 1.79-2.06 0-2.87-.92-2.98-2.1h-2.2c.12 2.19 1.76 3.42 3.68 3.83V21h3v-2.15c1.95-.37 3.5-1.5 3.5-3.55 0-2.84-2.43-3.81-4.7-4.4z"/></svg>
                Ver mis Préstamos
              </a>
              <a href="/cliente/pagos" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, padding: '1rem', background: '#fff', border: '1px solid var(--border)', color: 'var(--text-2)', borderRadius: 'var(--radius)', textDecoration: 'none', fontWeight: 600, fontSize: 14 }}>
                <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                Historial de Pagos
              </a>
            </div>
          </section>

          {/* Últimos pagos */}
          {data.pagos.length > 0 && (
            <section style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>Últimos pagos</h3>
                <a href="/cliente/pagos" style={{ fontSize: 12, color: 'var(--accent)', textDecoration: 'none', fontWeight: 700 }}>Ver todos →</a>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {data.pagos.map(p => (
                  <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 0.875rem', background: 'var(--bg-2)', borderRadius: 'var(--radius-sm)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--accent-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <svg width="14" height="14" fill="var(--accent)" viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
                      </div>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{p.descripcion}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 1 }}>
                          {new Date(p.fechaPago).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </div>
                      </div>
                    </div>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 14, color: 'var(--accent)', fontWeight: 700 }}>{fmt(p.monto)}</span>
                  </div>
                ))}
              </div>
            </section>
          )}
          {/* Banner liquidar — solo si pagó menos de la mitad */}
          {data.deudaTotal > 0 && data.pct < 50 && (
            <section style={{
              background: 'linear-gradient(135deg, var(--accent-dim) 0%, rgba(0,107,50,0.05) 100%)',
              border: '1.5px solid rgba(0,107,50,0.2)',
              borderRadius: 'var(--radius-lg)',
              padding: '1.25rem',
              display: 'flex', alignItems: 'center', gap: '1rem',
            }}>
              <div style={{ width: 48, height: 48, borderRadius: 14, background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 4px 12px var(--accent-dim)' }}>
                <svg width="24" height="24" fill="white" viewBox="0 0 24 24">
                  <path d="M11.8 10.9c-2.27-.59-3-1.2-3-2.15 0-1.09 1.01-1.85 2.7-1.85 1.78 0 2.44.85 2.5 2.1h2.21c-.07-1.72-1.12-3.3-3.21-3.81V3h-3v2.16c-1.94.42-3.5 1.68-3.5 3.61 0 2.31 1.91 3.46 4.7 4.13 2.5.6 3 1.48 3 2.41 0 .69-.49 1.79-2.7 1.79-2.06 0-2.87-.92-2.98-2.1h-2.2c.12 2.19 1.76 3.42 3.68 3.83V21h3v-2.15c1.95-.37 3.5-1.5 3.5-3.55 0-2.84-2.43-3.81-4.7-4.4z"/>
                </svg>
              </div>
              <div style={{ flex: 1 }}>
                <h4 style={{ fontSize: 15, fontWeight: 800, color: 'var(--accent)', marginBottom: 3 }}>
                  ¿Querés liquidar tu deuda hoy?
                </h4>
                <p style={{ fontSize: 12, color: 'var(--text-2)', lineHeight: 1.5, marginBottom: 10 }}>
                  Cancelá el total restante y obtené un descuento especial. Contactanos por WhatsApp para coordinar.
                </p>
                <a
                  href={`https://wa.me/59162292741?text=${encodeURIComponent(`Hola! Soy ${data.cliente.nombre} ${data.cliente.apellido} y me gustaría consultar sobre liquidar mi deuda total.`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 8,
                    padding: '0.625rem 1.25rem',
                    background: '#25d366', color: '#fff',
                    borderRadius: 'var(--radius-sm)', textDecoration: 'none',
                    fontSize: 13, fontWeight: 700, fontFamily: 'var(--font-body)',
                    boxShadow: '0 4px 12px rgba(37,211,102,0.3)',
                  }}
                >
                  <svg width="16" height="16" fill="white" viewBox="0 0 24 24">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                  </svg>
                  Consultar por WhatsApp
                </a>
              </div>
            </section>
          )}
          {/* Footer */}
          <div style={{ textAlign: 'center', paddingTop: '0.5rem' }}>
            <p style={{ fontSize: 11, color: 'var(--text-3)' }}>
              Desarrollado por{' '}
              <a href="https://www.devhub.com.ar/" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)', fontWeight: 700, textDecoration: 'none' }}>DevHub</a>
            </p>
          </div>
        </div>
      </main>

      {/* ── NAV BOTTOM MOBILE ── */}
      <nav style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 40, background: '#fff', borderTop: '1px solid var(--border)', padding: '0.625rem 1.5rem 0.75rem' }} className="mobile-nav">
        <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center', maxWidth: 480, margin: '0 auto' }}>
          {NAV_ITEMS.map(item => {
            const active = pathname === item.href
            return (
              <a key={item.href} href={item.href} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, textDecoration: 'none', color: active ? 'var(--accent)' : 'var(--text-3)', transition: 'color 0.15s' }}>
                {item.icon(active)}
                <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase' }}>{item.label}</span>
              </a>
            )
          })}
        </div>
      </nav>

      {/* Responsive CSS */}
      <style>{`
        .pc-sidebar    { display: none !important; }
        .mobile-header { display: flex !important; }
        .mobile-nav    { display: block !important; }
        .cliente-main  { margin-left: 0 !important; padding-bottom: 90px; }
        .dashboard-grid { display: flex; flex-direction: column; gap: 1.25rem; }
        .acciones-grid  { display: flex; flex-direction: column; gap: 0.75rem; }

        @media (min-width: 900px) {
          .pc-sidebar    { display: flex !important; }
          .mobile-header { display: none !important; }
          .mobile-nav    { display: none !important; }
          .cliente-main  { margin-left: 240px !important; padding-bottom: 2rem; }
          .dashboard-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1.25rem; }
          .acciones-grid  { display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; }
        }
      `}</style>
    </div>
  )
}