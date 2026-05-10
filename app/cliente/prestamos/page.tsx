import { createClient } from '@/lib/supabase-server'
import { prisma } from '@/lib/prisma'
import { unstable_cache } from 'next/cache'
import { redirect } from 'next/navigation'
import ClienteLayout from '../ClienteLayout'

const fmt = (n: number) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n)

export default async function ClientePrestamosPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const cliente = await prisma.cliente.findFirst({ where: { userId: user.id } })
  if (!cliente) redirect('/auth/login')

  const getPrestamos = unstable_cache(
    async (clienteId: string) => {
      const prestamos = await prisma.prestamo.findMany({
        where: { clienteId },
        orderBy: { createdAt: 'desc' },
      })
      return prestamos.map(p => ({
        id:              p.id,
        descripcion:     p.descripcion,
        estado:          p.estado,
        montoTotal:      Number(p.montoTotal),
        montoPagado:     Number(p.montoPagado),
        montoCuota:      Number(p.montoCuota),
        cantidadCuotas:  p.cantidadCuotas,
        cuotasPagadas:   p.cuotasPagadas,
        fechaInicio:     p.fechaInicio.toISOString(),
        fechaVencimiento: p.fechaVencimiento?.toISOString() ?? null,
        notas:           p.notas,
      }))
    },
    [`cliente-prestamos-${cliente.id}`],
    { revalidate: 20 }
  )

  const prestamos = await getPrestamos(cliente.id)

  return (
    <ClienteLayout cliente={{ nombre: cliente.nombre, apellido: cliente.apellido }} currentPath="/cliente/prestamos">
      <section style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 28, color: 'var(--text)', letterSpacing: '-0.02em', marginBottom: 4 }}>
          Mis Préstamos
        </h2>
        <p style={{ color: 'var(--text-2)', fontSize: 14 }}>{prestamos.length} préstamos registrados</p>
      </section>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {prestamos.length === 0 && (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-3)', background: '#fff', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)' }}>
            Sin préstamos registrados
          </div>
        )}
        {prestamos.map(p => {
          const pendiente = p.montoTotal - p.montoPagado
          const pct = p.montoTotal > 0 ? Math.round((p.montoPagado / p.montoTotal) * 100) : 0
          return (
            <div key={p.id} style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '1.25rem', borderLeft: `4px solid ${p.estado === 'pagado' ? 'var(--green)' : 'var(--accent)'}`, boxShadow: 'var(--shadow-sm)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem', gap: 8, flexWrap: 'wrap' }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--text)', marginBottom: 3 }}>{p.descripcion}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-3)' }}>
                    Desde {new Date(p.fechaInicio).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </div>
                </div>
                <span style={{ padding: '0.3rem 0.875rem', borderRadius: 20, fontSize: 12, fontWeight: 700, background: 'var(--accent-dim)', color: p.estado === 'pagado' ? 'var(--green)' : 'var(--accent)', border: '1px solid rgba(0,107,50,0.2)' }}>
                  {p.estado}
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8, marginBottom: '1rem' }}>
                {[
                  { label: 'Monto total', value: fmt(p.montoTotal),  color: 'var(--text)' },
                  { label: 'Pagado',      value: fmt(p.montoPagado), color: 'var(--accent)' },
                  { label: 'Pendiente',   value: fmt(pendiente),     color: pendiente > 0 ? 'var(--amber)' : 'var(--accent)' },
                  { label: 'Cuota',       value: `${fmt(p.montoCuota)} × ${p.cantidadCuotas}`, color: 'var(--text-2)' },
                ].map(s => (
                  <div key={s.label} style={{ background: 'var(--bg-2)', borderRadius: 'var(--radius-sm)', padding: '0.625rem 0.75rem' }}>
                    <div style={{ fontSize: 10, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700, marginBottom: 3 }}>{s.label}</div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 14, color: s.color, fontWeight: 700 }}>{s.value}</div>
                  </div>
                ))}
              </div>

              <div style={{ marginBottom: '0.875rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 12, color: 'var(--text-2)', fontWeight: 600 }}>
                  <span>Cuotas: {p.cuotasPagadas} de {p.cantidadCuotas} pagadas</span>
                  <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent)' }}>{pct}%</span>
                </div>
                <div style={{ height: 8, background: 'var(--bg-3)', borderRadius: 4, overflow: 'hidden', border: '1px solid var(--border)' }}>
                  <div style={{ height: '100%', width: `${pct}%`, background: p.estado === 'pagado' ? 'var(--green)' : 'linear-gradient(90deg, var(--accent), var(--accent-light))', borderRadius: 4 }} />
                </div>
              </div>

              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                {Array.from({ length: p.cantidadCuotas }, (_, i) => (
                  <div key={i} style={{ width: 22, height: 22, borderRadius: 6, background: i < p.cuotasPagadas ? 'var(--accent)' : 'var(--bg-3)', border: `1px solid ${i < p.cuotasPagadas ? 'transparent' : 'var(--border)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, color: i < p.cuotasPagadas ? '#fff' : 'var(--text-3)', fontWeight: 700 }}>
                    {i + 1}
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </ClienteLayout>
  )
}