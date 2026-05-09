import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import Link from 'next/link'

const fmt = (n: number) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n)

export default async function ClienteDetallePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const cliente = await prisma.cliente.findUnique({ where: { id } })
  if (!cliente) notFound()

  const prestamos = await prisma.prestamo.findMany({
    where: { clienteId: id },
    orderBy: { createdAt: 'desc' },
  })

  const pagos = await prisma.pago.findMany({
    where: { clienteId: id },
    orderBy: { fechaPago: 'desc' },
    include: { prestamo: { select: { descripcion: true } } },
  })

  const deudaTotal = prestamos
    .filter(p => p.estado === 'activo')
    .reduce((s, p) => s + (Number(p.montoTotal) - Number(p.montoPagado)), 0)

  return (
    <div style={{ animation: 'fadeUp 0.4s ease' }}>
      <div style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-3)', fontSize: 13 }}>
        <Link href="/admin/clientes" style={{ color: 'var(--accent-light)', textDecoration: 'none' }}>Clientes</Link>
        <span>›</span>
        <span>{cliente.nombre} {cliente.apellido}</span>
      </div>

      <div style={{ background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '1.5rem', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, letterSpacing: '-0.02em', marginBottom: 8 }}>
            {cliente.nombre} {cliente.apellido}
          </h1>
          <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
            {[{ label: 'Teléfono', value: cliente.telefono }, { label: 'Email', value: cliente.email }, { label: 'DNI', value: cliente.dni }]
              .filter(i => i.value).map(i => (
                <div key={i.label}>
                  <span style={{ fontSize: 11, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{i.label}</span>
                  <div style={{ color: 'var(--text-2)', fontSize: 14, fontFamily: 'var(--font-mono)' }}>{i.value}</div>
                </div>
              ))}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 11, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Deuda total</div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 28, color: deudaTotal > 0 ? 'var(--red)' : 'var(--green)' }}>{fmt(deudaTotal)}</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
        <div style={{ background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h2 style={{ fontSize: 16, fontWeight: 600 }}>Préstamos</h2>
            <Link href={`/admin/prestamos?cliente=${id}`} style={{ fontSize: 12, color: 'var(--accent-light)', textDecoration: 'none', padding: '0.3rem 0.75rem', border: '1px solid rgba(99,102,241,0.3)', borderRadius: 'var(--radius-sm)', background: 'var(--accent-dim)' }}>+ Nuevo</Link>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {prestamos.length === 0 && <p style={{ color: 'var(--text-3)', fontSize: 13 }}>Sin préstamos</p>}
            {prestamos.map(p => {
              const pct = Math.round((Number(p.montoPagado) / Number(p.montoTotal)) * 100)
              return (
                <div key={p.id} style={{ padding: '0.875rem', background: 'var(--bg-3)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ fontSize: 13, fontWeight: 500 }}>{p.descripcion}</span>
                    <span style={{ fontSize: 10, padding: '0.2rem 0.5rem', borderRadius: 20, background: p.estado === 'pagado' ? 'var(--green-dim)' : 'var(--accent-dim)', color: p.estado === 'pagado' ? 'var(--green)' : 'var(--accent-light)' }}>{p.estado}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-2)', marginBottom: 8 }}>
                    <span>Cuota: {fmt(Number(p.montoCuota))} × {p.cantidadCuotas}</span>
                    <span style={{ fontFamily: 'var(--font-mono)' }}>{fmt(Number(p.montoPagado))} / {fmt(Number(p.montoTotal))}</span>
                  </div>
                  <div style={{ height: 4, background: 'var(--bg-4)', borderRadius: 2, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: 'var(--accent)', borderRadius: 2 }} />
                  </div>
                  <div style={{ textAlign: 'right', fontSize: 11, color: 'var(--text-3)', marginTop: 4 }}>{pct}% pagado</div>
                  {p.estado === 'activo' && (
                    <Link href={`/admin/pagos?prestamo=${p.id}&cliente=${id}`} style={{ display: 'block', marginTop: 8, textAlign: 'center', padding: '0.4rem', background: 'var(--green-dim)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: 'var(--radius-sm)', color: 'var(--green)', textDecoration: 'none', fontSize: 12 }}>
                      Registrar pago
                    </Link>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        <div style={{ background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '1.25rem' }}>
          <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: '1rem' }}>Historial de pagos</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {pagos.length === 0 && <p style={{ color: 'var(--text-3)', fontSize: 13 }}>Sin pagos registrados</p>}
            {pagos.map(p => (
              <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.625rem 0.875rem', background: 'var(--bg-3)', borderRadius: 'var(--radius-sm)' }}>
                <div>
                  <div style={{ fontSize: 12, color: 'var(--text)', fontWeight: 500 }}>
                    {p.prestamo.descripcion}
                    {p.numeroCuota && <span style={{ color: 'var(--text-3)' }}> · Cuota {p.numeroCuota}</span>}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-3)' }}>
                    {new Date(p.fechaPago).toLocaleDateString('es-AR')} · {p.metodoPago}
                  </div>
                </div>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 14, color: 'var(--green)' }}>{fmt(Number(p.monto))}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}