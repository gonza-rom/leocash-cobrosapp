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

  const totalPrestado = prestamos.reduce((s, p) => s + Number(p.montoTotal), 0)
  const totalPagado   = prestamos.reduce((s, p) => s + Number(p.montoPagado), 0)
  const pctGlobal     = totalPrestado > 0 ? Math.round((totalPagado / totalPrestado) * 100) : 0

  return (
    <div style={{ animation: 'fadeUp 0.4s ease' }}>

      {/* Breadcrumb */}
      <div style={{ marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
        <Link href="/admin/clientes" style={{ color: 'var(--accent)', textDecoration: 'none', fontWeight: 600 }}>Clientes</Link>
        <span style={{ color: 'var(--text-3)' }}>›</span>
        <span style={{ color: 'var(--text-2)' }}>{cliente.nombre} {cliente.apellido}</span>
      </div>

      {/* Header cliente */}
      <div style={{
        background: 'var(--accent)', borderRadius: 'var(--radius-lg)',
        padding: '1.5rem', marginBottom: '1.25rem',
        position: 'relative', overflow: 'hidden',
        boxShadow: '0 8px 32px var(--accent-dim)',
      }}>
        <div style={{ position: 'absolute', top: -40, right: -40, width: 140, height: 140, borderRadius: '50%', background: 'rgba(255,255,255,0.07)' }} />
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 22, color: '#fff', flexShrink: 0 }}>
                {cliente.nombre.charAt(0).toUpperCase()}
              </div>
              <div>
                <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 26, color: '#fff', letterSpacing: '-0.02em', lineHeight: 1.1, marginBottom: 6 }}>
                  {cliente.nombre} {cliente.apellido}
                </h1>
                <div style={{ display: 'flex', gap: '1.25rem', flexWrap: 'wrap' }}>
                  {[
                    { label: 'Tel', value: cliente.telefono },
                    { label: 'Email', value: cliente.email },
                    { label: 'DNI', value: cliente.dni },
                  ].filter(i => i.value).map(i => (
                    <div key={i.label} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: 700 }}>{i.label}:</span>
                      <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.9)', fontFamily: 'var(--font-mono)' }}>{i.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.65)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700, marginBottom: 4 }}>Deuda total</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 30, color: '#fff', fontWeight: 700, letterSpacing: '-0.02em' }}>
                {fmt(deudaTotal)}
              </div>
              {deudaTotal === 0 && <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.8)', marginTop: 4 }}>✓ Al día</div>}
            </div>
          </div>

          {/* Barra progreso */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 11 }}>
              <span style={{ color: 'rgba(255,255,255,0.7)' }}>Progreso de cobro</span>
              <span style={{ color: 'rgba(255,255,255,0.9)', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>{pctGlobal}%</span>
            </div>
            <div style={{ height: 6, background: 'rgba(255,255,255,0.2)', borderRadius: 3, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${pctGlobal}%`, background: 'rgba(255,255,255,0.8)', borderRadius: 3 }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: 11 }}>
              <span style={{ color: 'rgba(255,255,255,0.65)', fontFamily: 'var(--font-mono)' }}>Pagado: {fmt(totalPagado)}</span>
              <span style={{ color: 'rgba(255,255,255,0.65)', fontFamily: 'var(--font-mono)' }}>Total: {fmt(totalPrestado)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Stats rápidas */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', marginBottom: '1.25rem' }}>
        {[
          { label: 'Préstamos', value: String(prestamos.length), color: 'var(--text)' },
          { label: 'Activos',   value: String(prestamos.filter(p => p.estado === 'activo').length), color: 'var(--accent)' },
          { label: 'Pagos',     value: String(pagos.length), color: 'var(--text-2)' },
        ].map(s => (
          <div key={s.label} style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '0.875rem', textAlign: 'center', boxShadow: 'var(--shadow-sm)' }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 24, color: s.color, fontWeight: 700 }}>{s.value}</div>
            <div style={{ fontSize: 11, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700, marginTop: 3 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Grid préstamos + pagos */}
      <div className="detalle-grid">

        {/* Préstamos */}
        <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '1.25rem', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>Préstamos</h2>
            <Link href={`/admin/prestamos?cliente=${id}`} style={{ fontSize: 12, color: 'var(--accent)', textDecoration: 'none', fontWeight: 700, padding: '0.3rem 0.875rem', border: '1px solid rgba(0,107,50,0.2)', borderRadius: 'var(--radius-sm)', background: 'var(--accent-dim)' }}>
              + Nuevo
            </Link>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {prestamos.length === 0 && <p style={{ color: 'var(--text-3)', fontSize: 13, padding: '1rem 0' }}>Sin préstamos</p>}
            {prestamos.map(p => {
              const pct = Number(p.montoTotal) > 0 ? Math.round((Number(p.montoPagado) / Number(p.montoTotal)) * 100) : 0
              const pendiente = Number(p.montoTotal) - Number(p.montoPagado)
              return (
                <div key={p.id} style={{
                  padding: '1rem', background: 'var(--bg-2)',
                  borderRadius: 'var(--radius)', border: '1px solid var(--border)',
                  borderLeft: `3px solid ${p.estado === 'pagado' ? 'var(--accent)' : p.estado === 'activo' ? 'var(--accent)' : 'var(--red)'}`,
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', marginBottom: 2 }}>{p.descripcion}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-3)' }}>
                        Desde {new Date(p.fechaInicio).toLocaleDateString('es-AR')}
                        {p.fechaVencimiento && ` · Vence ${new Date(p.fechaVencimiento).toLocaleDateString('es-AR')}`}
                      </div>
                    </div>
                    <span style={{ fontSize: 10, padding: '0.25rem 0.625rem', borderRadius: 20, fontWeight: 700, background: p.estado === 'pagado' ? 'var(--accent-dim)' : p.estado === 'activo' ? 'var(--accent-dim)' : 'rgba(186,26,26,0.1)', color: p.estado === 'pagado' ? 'var(--accent)' : p.estado === 'activo' ? 'var(--accent)' : 'var(--red)' }}>
                      {p.estado}
                    </span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6, marginBottom: 10 }}>
                    {[
                      { label: 'Cuota', value: `${fmt(Number(p.montoCuota))} × ${p.cantidadCuotas}` },
                      { label: 'Pagado', value: fmt(Number(p.montoPagado)), color: 'var(--accent)' },
                      { label: 'Pendiente', value: fmt(pendiente), color: pendiente > 0 ? 'var(--red)' : 'var(--accent)' },
                    ].map(s => (
                      <div key={s.label} style={{ background: '#fff', borderRadius: 'var(--radius-sm)', padding: '0.5rem', textAlign: 'center' }}>
                        <div style={{ fontSize: 9, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700, marginBottom: 3 }}>{s.label}</div>
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: s.color ?? 'var(--text)', fontWeight: 700 }}>{s.value}</div>
                      </div>
                    ))}
                  </div>

                  <div style={{ marginBottom: p.estado === 'activo' ? 10 : 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 5 }}>
                      <span style={{ color: 'var(--text-2)' }}>{p.cuotasPagadas} de {p.cantidadCuotas} cuotas</span>
                      <span style={{ color: 'var(--accent)', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>{pct}%</span>
                    </div>
                    <div style={{ height: 6, background: 'var(--bg-3)', borderRadius: 3, overflow: 'hidden', border: '1px solid var(--border)' }}>
                      <div style={{ height: '100%', width: `${pct}%`, background: 'var(--accent)', borderRadius: 3 }} />
                    </div>
                  </div>

                  {p.estado === 'activo' && (
                    <Link href={`/admin/pagos?prestamo=${p.id}&cliente=${id}`} style={{ display: 'block', textAlign: 'center', padding: '0.5rem', background: 'var(--accent)', color: '#fff', borderRadius: 'var(--radius-sm)', textDecoration: 'none', fontSize: 13, fontWeight: 700 }}>
                      Registrar pago
                    </Link>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Historial de pagos */}
        <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '1.25rem', boxShadow: 'var(--shadow-sm)' }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', marginBottom: '1rem' }}>Historial de pagos</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {pagos.length === 0 && <p style={{ color: 'var(--text-3)', fontSize: 13, padding: '1rem 0' }}>Sin pagos registrados</p>}
            {pagos.map(p => (
              <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', background: 'var(--bg-2)', borderRadius: 'var(--radius-sm)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 34, height: 34, borderRadius: 10, background: 'var(--accent-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <svg width="16" height="16" fill="var(--accent)" viewBox="0 0 24 24">
                      <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                    </svg>
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 2 }}>
                      {p.prestamo.descripcion}
                      {p.numeroCuota && <span style={{ color: 'var(--text-3)', fontWeight: 400 }}> · Cuota {p.numeroCuota}</span>}
                    </div>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      <span style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: 'var(--font-mono)' }}>
                        {new Date(p.fechaPago).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </span>
                      <span style={{ fontSize: 10, padding: '1px 7px', borderRadius: 10, background: 'var(--bg-3)', color: 'var(--text-3)' }}>
                        {p.metodoPago}
                      </span>
                    </div>
                  </div>
                </div>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 15, color: 'var(--accent)', fontWeight: 700, flexShrink: 0 }}>
                  {fmt(Number(p.monto))}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Dirección y notas si existen */}
      {(cliente.direccion || cliente.notas) && (
        <div style={{ marginTop: '1.25rem', background: '#fff', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '1.25rem', boxShadow: 'var(--shadow-sm)' }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', marginBottom: '0.875rem' }}>Información adicional</h2>
          <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
            {cliente.direccion && (
              <div>
                <div style={{ fontSize: 11, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: 700, marginBottom: 4 }}>Dirección</div>
                <div style={{ fontSize: 14, color: 'var(--text-2)' }}>{cliente.direccion}</div>
              </div>
            )}
            {cliente.notas && (
              <div>
                <div style={{ fontSize: 11, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: 700, marginBottom: 4 }}>Notas</div>
                <div style={{ fontSize: 14, color: 'var(--text-2)' }}>{cliente.notas}</div>
              </div>
            )}
          </div>
        </div>
      )}

      <style>{`
        .detalle-grid {
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
        }
        @media (min-width: 900px) {
          .detalle-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 1.25rem;
          }
        }
      `}</style>
    </div>
  )
}