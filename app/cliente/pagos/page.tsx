import { createClient } from '@/lib/supabase-server'
import { prisma } from '@/lib/prisma'
import { unstable_cache } from 'next/cache'
import { redirect } from 'next/navigation'
import ClienteLayout from '../ClienteLayout'

const fmt = (n: number) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n)

export default async function ClientePagosPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const cliente = await prisma.cliente.findFirst({ where: { userId: user.id } })
  if (!cliente) redirect('/auth/login')

  const getPagos = unstable_cache(
    async (clienteId: string) => {
      const pagos = await prisma.pago.findMany({
        where: { clienteId },
        orderBy: { fechaPago: 'desc' },
        include: { prestamo: { select: { descripcion: true, cantidadCuotas: true } } },
      })
      return pagos.map(p => ({
        id:          p.id,
        monto:       Number(p.monto),
        fechaPago:   p.fechaPago.toISOString(),
        numeroCuota: p.numeroCuota,
        metodoPago:  p.metodoPago,
        descripcion: p.prestamo.descripcion,
      }))
    },
    [`cliente-pagos-${cliente.id}`],
    { revalidate: 20 }
  )

  const pagos = await getPagos(cliente.id)
  const total = pagos.reduce((s, p) => s + p.monto, 0)

  const porMes: Record<string, typeof pagos> = {}
  pagos.forEach(p => {
    const mes = new Date(p.fechaPago).toLocaleDateString('es-AR', { month: 'long', year: 'numeric' })
    if (!porMes[mes]) porMes[mes] = []
    porMes[mes].push(p)
  })

  return (
    <ClienteLayout cliente={{ nombre: cliente.nombre, apellido: cliente.apellido }} currentPath="/cliente/pagos">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 28, color: 'var(--text)', letterSpacing: '-0.02em', marginBottom: 4 }}>Historial de Pagos</h2>
          <p style={{ color: 'var(--text-2)', fontSize: 14 }}>{pagos.length} pagos registrados</p>
        </div>
        <div style={{ background: 'var(--accent)', borderRadius: 'var(--radius)', padding: '0.75rem 1.25rem', textAlign: 'right' }}>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700, marginBottom: 2 }}>Total abonado</div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 22, color: '#fff', fontWeight: 700 }}>{fmt(total)}</div>
        </div>
      </div>

      {pagos.length === 0 && (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-3)', background: '#fff', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)' }}>
          Sin pagos registrados
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {Object.entries(porMes).map(([mes, pagosMes]) => (
          <div key={mes}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>{mes}</span>
              <span style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--accent)', fontWeight: 700 }}>
                {fmt(pagosMes.reduce((s, p) => s + p.monto, 0))}
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {pagosMes.map(p => (
                <div key={p.id} style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '1rem 1.125rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', boxShadow: 'var(--shadow-sm)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 40, height: 40, borderRadius: 12, background: 'var(--accent-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <svg width="18" height="18" fill="var(--accent)" viewBox="0 0 24 24">
                        <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                      </svg>
                    </div>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', marginBottom: 2 }}>{p.descripcion}</div>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <span style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: 'var(--font-mono)' }}>
                          {new Date(p.fechaPago).toLocaleDateString('es-AR', { day: '2-digit', month: 'short' })}
                        </span>
                        {p.numeroCuota && (
                          <span style={{ fontSize: 10, color: 'var(--text-3)', background: 'var(--bg-2)', padding: '1px 7px', borderRadius: 10, fontWeight: 700 }}>
                            Cuota {p.numeroCuota}
                          </span>
                        )}
                        <span style={{ fontSize: 10, color: 'var(--text-3)', background: 'var(--bg-2)', padding: '1px 7px', borderRadius: 10 }}>
                          {p.metodoPago}
                        </span>
                      </div>
                    </div>
                  </div>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 16, color: 'var(--accent)', fontWeight: 700, flexShrink: 0 }}>
                    {fmt(p.monto)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </ClienteLayout>
  )
}