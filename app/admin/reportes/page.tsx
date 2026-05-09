import { prisma } from '@/lib/prisma'

const fmt = (n: number) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n)

export default async function ReportesPage() {
  const [prestamos, pagos, totalClientes] = await Promise.all([
    prisma.prestamo.findMany({ include: { cliente: { select: { id: true, nombre: true, apellido: true } } } }),
    prisma.pago.findMany({ orderBy: { fechaPago: 'desc' }, include: { cliente: { select: { nombre: true, apellido: true } } } }),
    prisma.cliente.count({ where: { activo: true } }),
  ])

  const totalPrestado  = prestamos.reduce((s, p) => s + Number(p.montoTotal), 0)
  const totalCobrado   = prestamos.reduce((s, p) => s + Number(p.montoPagado), 0)
  const totalPendiente = totalPrestado - totalCobrado
  const prestActivos   = prestamos.filter(p => p.estado === 'activo').length
  const prestPagados   = prestamos.filter(p => p.estado === 'pagado').length

  const deudaPorCliente: Record<string, { nombre: string; deuda: number }> = {}
  prestamos.filter(p => p.estado === 'activo').forEach(p => {
    const pendiente = Number(p.montoTotal) - Number(p.montoPagado)
    if (!deudaPorCliente[p.clienteId]) deudaPorCliente[p.clienteId] = { nombre: `${p.cliente.nombre} ${p.cliente.apellido}`, deuda: 0 }
    deudaPorCliente[p.clienteId].deuda += pendiente
  })
  const top5 = Object.values(deudaPorCliente).sort((a, b) => b.deuda - a.deuda).slice(0, 5)

  const mesActual = new Date().toISOString().slice(0, 7)
  const pagosMes = pagos.filter(p => p.fechaPago.toISOString().startsWith(mesActual))
  const ingresosMes = pagosMes.reduce((s, p) => s + Number(p.monto), 0)
  const pct = totalPrestado > 0 ? Math.round((totalCobrado / totalPrestado) * 100) : 0

  return (
    <div style={{ animation: 'fadeUp 0.4s ease' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 30, color: 'var(--text)', letterSpacing: '-0.02em', marginBottom: 4 }}>Reportes</h1>
        <p style={{ color: 'var(--text-2)', fontSize: 14 }}>Resumen general del sistema</p>
      </div>

      {/* KPIs bento */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.875rem', marginBottom: '1.5rem' }} className="reportes-kpi-grid">

        {/* Card principal */}
        <div style={{ gridColumn: 'span 2', background: 'var(--accent)', borderRadius: 'var(--radius-lg)', padding: '1.5rem', position: 'relative', overflow: 'hidden', boxShadow: '0 8px 32px var(--accent-dim)' }}>
          <div style={{ position: 'absolute', top: -40, right: -40, width: 140, height: 140, borderRadius: '50%', background: 'rgba(255,255,255,0.07)' }} />
          <div style={{ position: 'relative', zIndex: 1 }}>
            <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700 }}>Cartera Total</span>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: 34, color: '#fff', marginTop: 4, fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1 }}>{fmt(totalPrestado)}</p>
            <div style={{ display: 'flex', gap: '2rem', marginTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.15)', paddingTop: '1rem' }}>
              <div>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.65)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700 }}>Cobrado</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 18, color: '#fff', marginTop: 2, fontWeight: 600 }}>{fmt(totalCobrado)}</div>
              </div>
              <div>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.65)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700 }}>Pendiente</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 18, color: 'rgba(255,255,255,0.9)', marginTop: 2, fontWeight: 600 }}>{fmt(totalPendiente)}</div>
              </div>
              <div>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.65)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700 }}>Progreso</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 18, color: 'rgba(255,255,255,0.9)', marginTop: 2, fontWeight: 600 }}>{pct}%</div>
              </div>
            </div>
          </div>
        </div>

        {[
          { label: 'Clientes activos',   value: String(totalClientes), color: 'var(--accent)' },
          { label: 'Préstamos activos',  value: String(prestActivos),  color: 'var(--amber)' },
          { label: 'Préstamos pagados',  value: String(prestPagados),  color: 'var(--text-2)' },
          { label: `Ingresos ${mesActual.slice(5)}`, value: fmt(ingresosMes), color: 'var(--accent)' },
          { label: 'Pagos este mes',     value: String(pagosMes.length), color: 'var(--text-2)' },
          { label: 'Pagos totales',      value: String(pagos.length),  color: 'var(--text-3)' },
        ].map((k, i) => (
          <div key={i} style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '1.125rem', boxShadow: 'var(--shadow-sm)' }}>
            <div style={{ fontSize: 10, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: 700, marginBottom: 8 }}>{k.label}</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 22, color: k.color, fontWeight: 700 }}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* Barra progreso */}
      <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '1.25rem', marginBottom: '1.25rem', boxShadow: 'var(--shadow-sm)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>Progreso de cobro global</span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 14, color: 'var(--accent)', fontWeight: 700 }}>{pct}%</span>
        </div>
        <div style={{ height: 10, background: 'var(--bg-3)', borderRadius: 5, overflow: 'hidden', border: '1px solid var(--border)' }}>
          <div style={{ height: '100%', width: `${pct}%`, background: 'linear-gradient(90deg, var(--accent), var(--accent-light))', borderRadius: 5 }} />
        </div>
      </div>

      {/* Grid inferior */}
      <div className="reportes-bottom-grid">

        {/* Top deudores */}
        <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '1.25rem', boxShadow: 'var(--shadow-sm)' }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', marginBottom: '1rem' }}>Top 5 deudores</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {top5.length === 0 && <p style={{ color: 'var(--text-3)', fontSize: 13 }}>Sin deudas activas</p>}
            {top5.map((c, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', background: 'var(--bg-2)', borderRadius: 'var(--radius-sm)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 28, height: 28, borderRadius: '50%', background: i === 0 ? 'rgba(186,26,26,0.1)' : 'var(--bg-3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: i === 0 ? 'var(--red)' : 'var(--text-3)', flexShrink: 0 }}>
                    #{i + 1}
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{c.nombre}</span>
                </div>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--red)', fontWeight: 700 }}>{fmt(c.deuda)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Pagos del mes */}
        <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '1.25rem', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>Pagos del mes</h2>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--accent)', fontWeight: 700 }}>{fmt(ingresosMes)}</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 320, overflow: 'auto' }}>
            {pagosMes.length === 0 && <p style={{ color: 'var(--text-3)', fontSize: 13 }}>Sin pagos este mes</p>}
            {pagosMes.slice(0, 10).map(p => (
              <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.625rem 0.75rem', background: 'var(--bg-2)', borderRadius: 'var(--radius-sm)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'var(--accent-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: 'var(--accent)', flexShrink: 0 }}>
                    {p.cliente.nombre.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>{p.cliente.nombre} {p.cliente.apellido}</div>
                    <div style={{ fontSize: 10, color: 'var(--text-3)', fontFamily: 'var(--font-mono)' }}>{p.fechaPago.toISOString().split('T')[0]}</div>
                  </div>
                </div>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--accent)', fontWeight: 700 }}>{fmt(Number(p.monto))}</span>
              </div>
            ))}
            {pagosMes.length > 10 && <div style={{ textAlign: 'center', fontSize: 12, color: 'var(--text-3)', paddingTop: 4 }}>+{pagosMes.length - 10} más</div>}
          </div>
        </div>
      </div>

      <style>{`
        .reportes-kpi-grid { }
        .reportes-bottom-grid { display: flex; flex-direction: column; gap: 1rem; margin-top: 1rem; }

        @media (min-width: 900px) {
          .reportes-kpi-grid { grid-template-columns: repeat(4, 1fr) !important; }
          .reportes-bottom-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1.25rem; }
        }
      `}</style>
    </div>
  )
}