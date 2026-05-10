import { prisma } from '@/lib/prisma'
import { getDashboardData } from '@/lib/queries'
import Link from 'next/link'

const fmt = (n: number) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n)

export default async function AdminDashboard() {
  const { totalClientes, prestamosData, ultimosPagos } = await getDashboardData()

  const pagosHoy = await prisma.pago.findMany({
    where: { fechaPago: { gte: new Date(new Date().setHours(0,0,0,0)) } },
    select: { monto: true },
  })

  const totalPrestado  = prestamosData.reduce((s, p) => s + p.montoTotal, 0)
  const totalCobrado   = prestamosData.reduce((s, p) => s + p.montoPagado, 0)
  const totalPendiente = totalPrestado - totalCobrado
  const ingresosHoy    = pagosHoy.reduce((s, p) => s + Number(p.monto), 0)
  const prestActivos   = prestamosData.filter(p => p.estado === 'activo').length
  const pct = totalPrestado > 0 ? Math.round((totalCobrado / totalPrestado) * 100) : 0

  // Ganancias reales: capital_original vs monto_total
  const totalCapital    = prestamosData.reduce((s, p) => s + (p.capitalOriginal ?? p.montoTotal), 0)
  const gananciaTotal   = totalPrestado - totalCapital  // interés total generado por toda la cartera

  // Ganancia ya cobrada: proporción del interés según lo pagado
  const gananciaCobrada = prestamosData.reduce((s, p) => {
    const capital = p.capitalOriginal ?? p.montoTotal
    const interesPrestamo = p.montoTotal - capital
    const pctPagado = p.montoTotal > 0 ? p.montoPagado / p.montoTotal : 0
    return s + (interesPrestamo * pctPagado)
  }, 0)

  const gananciaPendiente = gananciaTotal - gananciaCobrada
  const rendimiento = totalCapital > 0 ? ((gananciaTotal / totalCapital) * 100).toFixed(1) : '0'

  const deudaPorCliente: Record<string, { nombre: string; deuda: number; clienteId: string }> = {}
  prestamosData.filter(p => p.estado === 'activo').forEach(p => {
    const pendiente = p.montoTotal - p.montoPagado
    if (!deudaPorCliente[p.clienteId]) deudaPorCliente[p.clienteId] = {
      nombre: `${p.cliente.nombre} ${p.cliente.apellido}`,
      deuda: 0, clienteId: p.clienteId,
    }
    deudaPorCliente[p.clienteId].deuda += pendiente
  })
  const topDeudores = Object.values(deudaPorCliente).sort((a, b) => b.deuda - a.deuda).slice(0, 5)

  return (
    <div style={{ animation: 'fadeUp 0.4s ease' }}>

      {/* Header */}
      <div style={{ marginBottom: '1.25rem' }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, color: 'var(--text)', letterSpacing: '-0.02em', marginBottom: 4 }}>Dashboard</h1>
        <p style={{ color: 'var(--text-2)', fontSize: 13 }}>
          {new Date().toLocaleDateString('es-AR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {/* Card principal */}
      <div style={{
        background: 'var(--accent)', borderRadius: 'var(--radius-lg)',
        padding: '1.5rem', marginBottom: '1rem',
        position: 'relative', overflow: 'hidden',
        boxShadow: '0 8px 32px var(--accent-dim)',
      }}>
        <div style={{ position: 'absolute', top: -40, right: -40, width: 160, height: 160, borderRadius: '50%', background: 'rgba(255,255,255,0.07)' }} />
        <div style={{ position: 'relative', zIndex: 1 }}>
          <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700 }}>Capital en Cartera</span>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: 34, color: '#fff', marginTop: 4, letterSpacing: '-0.02em', fontWeight: 700, lineHeight: 1 }}>{fmt(totalCapital)}</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8, marginBottom: '1rem' }}>
            <svg width="14" height="14" fill="white" viewBox="0 0 24 24"><path d="M16 6l2.29 2.29-4.88 4.88-4-4L2 16.59 3.41 18l6-6 4 4 6.3-6.29L22 12V6z"/></svg>
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.8)' }}>{prestActivos} préstamos activos · {fmt(totalPrestado)} a cobrar</span>
          </div>

          <div style={{ borderTop: '1px solid rgba(255,255,255,0.15)', paddingTop: '1rem', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
            <div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700, marginBottom: 3 }}>Ganancia total</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 16, color: '#fff', fontWeight: 700 }}>{fmt(gananciaTotal)}</div>
            </div>
            <div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700, marginBottom: 3 }}>Ya cobrado</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 16, color: 'rgba(255,255,255,0.85)', fontWeight: 700 }}>{fmt(gananciaCobrada)}</div>
            </div>
            <div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700, marginBottom: 3 }}>Rendimiento</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 16, color: '#fff', fontWeight: 700 }}>{rendimiento}%</div>
            </div>
          </div>
        </div>
      </div>

      {/* Cards secundarias */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>

        <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '1rem', boxShadow: 'var(--shadow-sm)' }}>
          <span style={{ fontSize: 10, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: 700 }}>Clientes</span>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 32, color: 'var(--text)', fontWeight: 700, marginTop: 6, lineHeight: 1 }}>{totalClientes}</div>
          <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 4 }}>activos</div>
        </div>

        <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '1rem', boxShadow: 'var(--shadow-sm)' }}>
          <span style={{ fontSize: 10, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: 700 }}>Ingresos hoy</span>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 20, color: 'var(--amber)', fontWeight: 700, marginTop: 6, lineHeight: 1 }}>{fmt(ingresosHoy)}</div>
          <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 4 }}>{pagosHoy.length} pagos</div>
        </div>

        {/* Ganancia cobrada */}
        <div style={{ background: 'linear-gradient(135deg, var(--accent-dim) 0%, rgba(0,107,50,0.03) 100%)', border: '1.5px solid rgba(0,107,50,0.15)', borderRadius: 'var(--radius-lg)', padding: '1rem', boxShadow: 'var(--shadow-sm)' }}>
          <span style={{ fontSize: 10, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: 700 }}>Ganancia cobrada</span>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 20, color: 'var(--accent)', fontWeight: 700, marginTop: 6, lineHeight: 1 }}>{fmt(gananciaCobrada)}</div>
          <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 4 }}>interés ya ingresado</div>
        </div>

        {/* Ganancia pendiente */}
        <div style={{ background: 'rgba(245,158,11,0.05)', border: '1.5px solid rgba(245,158,11,0.2)', borderRadius: 'var(--radius-lg)', padding: '1rem', boxShadow: 'var(--shadow-sm)' }}>
          <span style={{ fontSize: 10, color: 'var(--amber)', textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: 700 }}>Ganancia pendiente</span>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 20, color: 'var(--amber)', fontWeight: 700, marginTop: 6, lineHeight: 1 }}>{fmt(gananciaPendiente)}</div>
          <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 4 }}>interés por cobrar</div>
        </div>
      </div>

      {/* Progreso cobro + capital */}
      <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '1.25rem', boxShadow: 'var(--shadow-sm)', marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>Progreso de cobro</span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 14, color: 'var(--accent)', fontWeight: 700 }}>{pct}%</span>
        </div>
        <div style={{ height: 10, background: 'var(--bg-3)', borderRadius: 5, overflow: 'hidden', border: '1px solid var(--border)', marginBottom: 8 }}>
          <div style={{ height: '100%', width: `${pct}%`, background: 'linear-gradient(90deg, var(--accent), var(--accent-light))', borderRadius: 5 }} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
          {[
            { label: 'Capital prestado', value: fmt(totalCapital),   color: 'var(--text)' },
            { label: 'Total cobrado',    value: fmt(totalCobrado),   color: 'var(--accent)' },
            { label: 'Pendiente',        value: fmt(totalPendiente), color: 'var(--red)' },
          ].map(s => (
            <div key={s.label} style={{ background: 'var(--bg-2)', borderRadius: 'var(--radius-sm)', padding: '0.625rem', textAlign: 'center' }}>
              <div style={{ fontSize: 9, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700, marginBottom: 4 }}>{s.label}</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: s.color, fontWeight: 700 }}>{s.value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Grid inferior */}
      <div className="dashboard-bottom-grid">

        {/* Últimos pagos */}
        <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>Últimos pagos</h2>
            <Link href="/admin/pagos" style={{ fontSize: 12, color: 'var(--accent)', textDecoration: 'none', fontWeight: 700 }}>Ver todos →</Link>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {ultimosPagos.length === 0 && <p style={{ color: 'var(--text-3)', fontSize: 13 }}>Sin pagos registrados</p>}
            {ultimosPagos.map(p => (
              <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', background: 'var(--bg-2)', borderRadius: 'var(--radius-sm)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'var(--accent-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontWeight: 700, fontSize: 13, color: 'var(--accent)' }}>
                    {p.cliente.nombre.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{p.cliente.nombre} {p.cliente.apellido}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{new Date(p.fechaPago).toLocaleDateString('es-AR')}</div>
                  </div>
                </div>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--accent)', fontWeight: 700, flexShrink: 0 }}>{fmt(p.monto)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Top deudores */}
        <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>Mayores deudas</h2>
            <Link href="/admin/clientes" style={{ fontSize: 12, color: 'var(--red)', textDecoration: 'none', fontWeight: 700 }}>Ver todos →</Link>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {topDeudores.length === 0 && <p style={{ color: 'var(--text-3)', fontSize: 13 }}>Sin deudas activas</p>}
            {topDeudores.map((c, i) => (
              <Link key={c.clienteId} href={`/admin/clientes/${c.clienteId}`} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', background: 'var(--bg-2)', borderRadius: 'var(--radius-sm)', textDecoration: 'none' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 26, height: 26, borderRadius: '50%', background: i === 0 ? 'rgba(186,26,26,0.1)' : 'var(--bg-3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: i === 0 ? 'var(--red)' : 'var(--text-3)', flexShrink: 0 }}>
                    #{i + 1}
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 140 }}>{c.nombre}</span>
                </div>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--red)', fontWeight: 700, flexShrink: 0 }}>{fmt(c.deuda)}</span>
              </Link>
            ))}
          </div>
        </div>

        {/* Acciones rápidas */}
        <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '1.25rem' }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', marginBottom: '1rem' }}>Acciones rápidas</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[
              { href: '/admin/clientes',  label: 'Nuevo cliente',  color: 'var(--accent)', bg: 'var(--accent-dim)' },
              { href: '/admin/prestamos', label: 'Nuevo préstamo', color: 'var(--accent)', bg: 'var(--accent-dim)' },
              { href: '/admin/pagos',     label: 'Registrar pago', color: 'var(--amber)',  bg: 'var(--amber-dim)' },
              { href: '/admin/reportes',  label: 'Ver reportes',   color: 'var(--text-2)', bg: 'var(--bg-2)' },
            ].map(a => (
              <Link key={a.href} href={a.href} style={{ display: 'flex', alignItems: 'center', padding: '0.75rem 0.875rem', background: a.bg, border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: a.color, textDecoration: 'none', fontSize: 14, fontWeight: 600 }}>
                {a.label}
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* FAB mobile */}
      <Link href="/admin/clientes" style={{
        position: 'fixed', bottom: 82, right: 20, zIndex: 50,
        width: 52, height: 52, borderRadius: '50%',
        background: 'var(--accent)', color: '#fff',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 6px 20px var(--accent-dim)', textDecoration: 'none',
      }} className="admin-fab">
        <svg width="24" height="24" fill="white" viewBox="0 0 24 24">
          <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
        </svg>
      </Link>

      <style>{`
        .dashboard-bottom-grid { display: flex; flex-direction: column; gap: 1rem; }
        .admin-fab { display: flex !important; }
        @media (min-width: 900px) {
          .dashboard-bottom-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 1.25rem; }
          .admin-fab { display: none !important; }
        }
      `}</style>
    </div>
  )
}