import { prisma } from '@/lib/prisma'

export default async function AdminDashboard() {
  const [
    totalClientes,
    prestamosData,
    pagosHoy,
  ] = await Promise.all([
    prisma.cliente.count({ where: { activo: true } }),
    prisma.prestamo.findMany({ select: { montoTotal: true, montoPagado: true, estado: true } }),
    prisma.pago.findMany({
      where: { fechaPago: { gte: new Date(new Date().setHours(0,0,0,0)) } },
      select: { monto: true },
    }),
  ])

  const totalPrestado  = prestamosData.reduce((s, p) => s + Number(p.montoTotal), 0)
  const totalCobrado   = prestamosData.reduce((s, p) => s + Number(p.montoPagado), 0)
  const totalPendiente = totalPrestado - totalCobrado
  const ingresosHoy    = pagosHoy.reduce((s, p) => s + Number(p.monto), 0)
  const prestActivos   = prestamosData.filter(p => p.estado === 'activo').length
  const pct = totalPrestado > 0 ? Math.round((totalCobrado / totalPrestado) * 100) : 0

  const ultimosPagos = await prisma.pago.findMany({
    orderBy: { createdAt: 'desc' },
    take: 5,
    include: {
      cliente: { select: { nombre: true, apellido: true } },
      prestamo: { select: { descripcion: true } },
    },
  })

  const fmt = (n: number) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n)

  const cards = [
    { label: 'Total prestado',   value: fmt(totalPrestado),  color: 'var(--accent)',  sub: `${prestActivos} préstamos activos` },
    { label: 'Total cobrado',    value: fmt(totalCobrado),   color: 'var(--green)',   sub: `${pct}% del total` },
    { label: 'Pendiente',        value: fmt(totalPendiente), color: 'var(--red)',     sub: 'Por cobrar' },
    { label: 'Ingresos hoy',     value: fmt(ingresosHoy),    color: 'var(--amber)',   sub: `${pagosHoy.length} pagos registrados` },
  ]

  return (
    <div style={{ animation: 'fadeUp 0.4s ease' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 32, color: 'var(--text)', marginBottom: 4, letterSpacing: '-0.02em' }}>Dashboard</h1>
        <p style={{ color: 'var(--text-2)', fontSize: 14 }}>
          {new Date().toLocaleDateString('es-AR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        {cards.map((c, i) => (
          <div key={i} style={{ background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '1.25rem', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: c.color, opacity: 0.7 }} />
            <div style={{ fontSize: 12, color: 'var(--text-2)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{c.label}</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 22, color: c.color, marginBottom: 4 }}>{c.value}</div>
            <div style={{ fontSize: 12, color: 'var(--text-3)' }}>{c.sub}</div>
          </div>
        ))}
      </div>

      <div style={{ background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '1.25rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
          <span style={{ fontSize: 13, color: 'var(--text-2)' }}>Progreso de cobro global</span>
          <span style={{ fontSize: 13, color: 'var(--text)', fontFamily: 'var(--font-mono)' }}>{pct}%</span>
        </div>
        <div style={{ height: 8, background: 'var(--bg-4)', borderRadius: 4, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${pct}%`, background: 'linear-gradient(90deg, var(--accent), var(--green))', borderRadius: 4 }} />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
        <div style={{ background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h2 style={{ fontSize: 15, color: 'var(--text)', fontWeight: 600 }}>Últimos pagos</h2>
            <a href="/admin/pagos" style={{ fontSize: 12, color: 'var(--accent-light)', textDecoration: 'none' }}>Ver todos →</a>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {ultimosPagos.length === 0 && <p style={{ color: 'var(--text-3)', fontSize: 13 }}>Sin pagos registrados</p>}
            {ultimosPagos.map(p => (
              <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.625rem', background: 'var(--bg-3)', borderRadius: 'var(--radius-sm)', gap: 8 }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 13, color: 'var(--text)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {p.cliente.nombre} {p.cliente.apellido}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-3)' }}>
                    {new Date(p.fechaPago).toLocaleDateString('es-AR')}
                  </div>
                </div>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--green)', flexShrink: 0 }}>{fmt(Number(p.monto))}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '1.25rem' }}>
          <h2 style={{ fontSize: 15, color: 'var(--text)', fontWeight: 600, marginBottom: '1rem' }}>Acciones rápidas</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[
              { href: '/admin/clientes', label: 'Nuevo cliente',       color: 'var(--accent)' },
              { href: '/admin/prestamos', label: 'Nuevo préstamo',     color: 'var(--green)' },
              { href: '/admin/pagos',    label: 'Registrar pago',      color: 'var(--amber)' },
              { href: '/admin/clientes', label: 'Ver todos los clientes', color: 'var(--text-2)' },
            ].map((a, i) => (
              <a key={i} href={a.href} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0.7rem 0.875rem', background: 'var(--bg-3)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: a.color, textDecoration: 'none', fontSize: 14, transition: 'all 0.15s' }}>
                {a.label}
              </a>
            ))}
          </div>
          <div style={{ marginTop: '1rem', padding: '0.875rem', background: 'var(--bg-3)', borderRadius: 'var(--radius-sm)' }}>
            <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Clientes totales</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 28, color: 'var(--text)' }}>{totalClientes}</div>
          </div>
        </div>
      </div>
    </div>
  )
}