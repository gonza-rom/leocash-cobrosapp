import { prisma } from '@/lib/prisma'

const fmt = (n: number) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n)

export default async function ReportesPage() {
  const [prestamos, pagos, totalClientes] = await Promise.all([
    prisma.prestamo.findMany({ include: { cliente: { select: { nombre: true, apellido: true } } } }),
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
  const top5Deuda = Object.values(deudaPorCliente).sort((a, b) => b.deuda - a.deuda).slice(0, 5)

  const mesActual = new Date().toISOString().slice(0, 7)
  const pagosMes = pagos.filter(p => p.fechaPago.toISOString().startsWith(mesActual))
  const ingresosMes = pagosMes.reduce((s, p) => s + Number(p.monto), 0)

  return (
    <div style={{ animation: 'fadeUp 0.4s ease' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 30, letterSpacing: '-0.02em', marginBottom: 4 }}>Reportes</h1>
        <p style={{ color: 'var(--text-2)', fontSize: 14 }}>Resumen general del sistema</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        {[
          { label: 'Clientes activos',       value: String(totalClientes),  color: 'var(--accent)' },
          { label: 'Préstamos activos',       value: String(prestActivos),   color: 'var(--amber)' },
          { label: 'Préstamos pagados',       value: String(prestPagados),   color: 'var(--green)' },
          { label: 'Total prestado',          value: fmt(totalPrestado),     color: 'var(--text)' },
          { label: 'Total cobrado',           value: fmt(totalCobrado),      color: 'var(--green)' },
          { label: 'Total pendiente',         value: fmt(totalPendiente),    color: 'var(--red)' },
          { label: `Ingresos ${mesActual}`,   value: fmt(ingresosMes),       color: 'var(--accent-light)' },
          { label: 'Pagos este mes',          value: String(pagosMes.length),color: 'var(--text-2)' },
        ].map((k, i) => (
          <div key={i} style={{ background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '1rem' }}>
            <div style={{ fontSize: 11, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>{k.label}</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 20, color: k.color }}>{k.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
        <div style={{ background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '1.25rem' }}>
          <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: '1rem' }}>Top 5 deudores</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {top5Deuda.length === 0 && <p style={{ color: 'var(--text-3)', fontSize: 13 }}>Sin deudas activas</p>}
            {top5Deuda.map((c, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.625rem', background: 'var(--bg-3)', borderRadius: 'var(--radius-sm)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-3)', width: 16 }}>#{i + 1}</span>
                  <span style={{ fontSize: 13, fontWeight: 500 }}>{c.nombre}</span>
                </div>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--red)' }}>{fmt(c.deuda)}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '1.25rem' }}>
          <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: '1rem' }}>Pagos del mes</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 300, overflow: 'auto' }}>
            {pagosMes.length === 0 && <p style={{ color: 'var(--text-3)', fontSize: 13 }}>Sin pagos este mes</p>}
            {pagosMes.slice(0, 10).map(p => (
              <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0.625rem', background: 'var(--bg-3)', borderRadius: 'var(--radius-sm)' }}>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 500 }}>{p.cliente.nombre} {p.cliente.apellido}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: 'var(--font-mono)' }}>{p.fechaPago.toISOString().split('T')[0]}</div>
                </div>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--green)' }}>{fmt(Number(p.monto))}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}