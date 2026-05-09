import { createClient } from '@/lib/supabase-server'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'

const fmt = (n: number) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n)

export default async function ClienteDashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const cliente = await prisma.cliente.findFirst({ where: { userId: user.id } })
  if (!cliente) redirect('/auth/login')

  const prestamos = await prisma.prestamo.findMany({
    where: { clienteId: cliente.id },
    orderBy: { createdAt: 'desc' },
  })

  const pagos = await prisma.pago.findMany({
    where: { clienteId: cliente.id },
    orderBy: { fechaPago: 'desc' },
    take: 5,
    include: { prestamo: { select: { descripcion: true } } },
  })

  const activos    = prestamos.filter(p => p.estado === 'activo')
  const deudaTotal = activos.reduce((s, p) => s + (Number(p.montoTotal) - Number(p.montoPagado)), 0)
  const totalPrestado = prestamos.reduce((s, p) => s + Number(p.montoTotal), 0)
  const totalPagado   = prestamos.reduce((s, p) => s + Number(p.montoPagado), 0)
  const pct = totalPrestado > 0 ? Math.round((totalPagado / totalPrestado) * 100) : 0

  const conVencimiento = activos.filter(p => p.fechaVencimiento).sort((a, b) =>
    new Date(a.fechaVencimiento!).getTime() - new Date(b.fechaVencimiento!).getTime()
  )
  const proximo = conVencimiento[0]

  return (
    <div style={{ animation: 'fadeUp 0.4s ease' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, letterSpacing: '-0.02em', marginBottom: 4 }}>Hola, {cliente.nombre} 👋</h1>
        <p style={{ color: 'var(--text-2)', fontSize: 14 }}>Este es el resumen de tu cuenta</p>
      </div>

      <div style={{ background: deudaTotal > 0 ? 'linear-gradient(135deg, rgba(239,68,68,0.08), rgba(239,68,68,0.02))' : 'linear-gradient(135deg, rgba(34,197,94,0.08), rgba(34,197,94,0.02))', border: `1px solid ${deudaTotal > 0 ? 'rgba(239,68,68,0.2)' : 'rgba(34,197,94,0.2)'}`, borderRadius: 'var(--radius-lg)', padding: '1.5rem', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ fontSize: 12, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>{deudaTotal > 0 ? 'Deuda pendiente' : 'Estado de cuenta'}</div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 36, color: deudaTotal > 0 ? 'var(--red)' : 'var(--green)', letterSpacing: '-0.02em' }}>{fmt(deudaTotal)}</div>
          {deudaTotal === 0 && <div style={{ fontSize: 13, color: 'var(--green)', marginTop: 4 }}>✓ Al día</div>}
        </div>
        {proximo && (
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 11, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>Próximo vencimiento</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 20, color: 'var(--amber)' }}>{new Date(proximo.fechaVencimiento!).toLocaleDateString('es-AR')}</div>
            <div style={{ fontSize: 12, color: 'var(--text-2)', marginTop: 2 }}>{proximo.descripcion}</div>
          </div>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        {[
          { label: 'Préstamos activos', value: String(activos.length),  color: 'var(--accent)' },
          { label: 'Total prestado',    value: fmt(totalPrestado),       color: 'var(--text)' },
          { label: 'Total pagado',      value: fmt(totalPagado),         color: 'var(--green)' },
        ].map((s, i) => (
          <div key={i} style={{ background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '1rem' }}>
            <div style={{ fontSize: 11, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>{s.label}</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 18, color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      <div style={{ background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '1.25rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
          <span style={{ fontSize: 13, color: 'var(--text-2)' }}>Progreso total de pago</span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 14, color: 'var(--text)' }}>{pct}%</span>
        </div>
        <div style={{ height: 10, background: 'var(--bg-4)', borderRadius: 5, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${pct}%`, background: 'linear-gradient(90deg, var(--accent), var(--green))', borderRadius: 5 }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: 12, color: 'var(--text-3)' }}>
          <span>Pagado: {fmt(totalPagado)}</span>
          <span>Total: {fmt(totalPrestado)}</span>
        </div>
      </div>

      <div style={{ background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '1.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h2 style={{ fontSize: 15, fontWeight: 600 }}>Últimos pagos</h2>
          <a href="/cliente/pagos" style={{ fontSize: 12, color: 'var(--accent-light)', textDecoration: 'none' }}>Ver todos →</a>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {pagos.length === 0 && <p style={{ color: 'var(--text-3)', fontSize: 13 }}>Sin pagos registrados</p>}
          {pagos.map(p => (
            <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.625rem 0.875rem', background: 'var(--bg-3)', borderRadius: 'var(--radius-sm)' }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 500 }}>{p.prestamo.descripcion}</div>
                <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{new Date(p.fechaPago).toLocaleDateString('es-AR')}</div>
              </div>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 14, color: 'var(--green)' }}>{fmt(Number(p.monto))}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}