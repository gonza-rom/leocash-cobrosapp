import { createClient } from '@/lib/supabase-server'
import { prisma } from '@/lib/prisma'
import { unstable_cache } from 'next/cache'
import { redirect } from 'next/navigation'
import ClienteDashboardClient from './ClienteDashboardClient'

export default async function ClienteDashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const cliente = await prisma.cliente.findFirst({ where: { userId: user.id } })
  if (!cliente) redirect('/auth/login')

  // Cache por cliente — revalida cada 20 segundos
  const getClienteData = unstable_cache(
    async (clienteId: string) => {
      const [prestamos, pagos] = await Promise.all([
        prisma.prestamo.findMany({
          where: { clienteId },
          orderBy: { createdAt: 'desc' },
        }),
        prisma.pago.findMany({
          where: { clienteId },
          orderBy: { fechaPago: 'desc' },
          take: 5,
          include: { prestamo: { select: { descripcion: true } } },
        }),
      ])

      return {
        prestamos: prestamos.map(p => ({
          id:              p.id,
          clienteId:       p.clienteId,
          estado:          p.estado,
          montoTotal:      Number(p.montoTotal),
          montoPagado:     Number(p.montoPagado),
          montoCuota:      Number(p.montoCuota),
          cantidadCuotas:  p.cantidadCuotas,
          cuotasPagadas:   p.cuotasPagadas,
          fechaInicio:     p.fechaInicio.toISOString(),
          fechaVencimiento: p.fechaVencimiento?.toISOString() ?? null,
          descripcion:     p.descripcion,
        })),
        pagos: pagos.map(p => ({
          id:          p.id,
          monto:       Number(p.monto),
          fechaPago:   p.fechaPago.toISOString(),
          descripcion: p.prestamo.descripcion,
        })),
      }
    },
    [`cliente-dashboard-${cliente.id}`],
    { revalidate: 20 }
  )

  const { prestamos, pagos } = await getClienteData(cliente.id)

  // Puntaje — sin cache porque cambia con cada pago
  const { data: puntaje } = await supabase
    .from('puntajes')
    .select('puntos_actual, estado')
    .eq('cliente_id', cliente.id)
    .order('updated_at', { ascending: false })
    .limit(1)
    .single()

  const activos       = prestamos.filter(p => p.estado === 'activo')
  const deudaTotal    = activos.reduce((s, p) => s + (p.montoTotal - p.montoPagado), 0)
  const totalPrestado = prestamos.reduce((s, p) => s + p.montoTotal, 0)
  const totalPagado   = prestamos.reduce((s, p) => s + p.montoPagado, 0)
  const pct           = totalPrestado > 0 ? Math.round((totalPagado / totalPrestado) * 100) : 0
  const cuotasTotales = activos.reduce((s, p) => s + p.cantidadCuotas, 0)
  const cuotasPagadas = activos.reduce((s, p) => s + p.cuotasPagadas, 0)

  const conVencimiento = activos
    .filter(p => p.fechaVencimiento)
    .sort((a, b) => new Date(a.fechaVencimiento!).getTime() - new Date(b.fechaVencimiento!).getTime())
  const proximo = conVencimiento[0]

  const data = {
    cliente:            { nombre: cliente.nombre, apellido: cliente.apellido },
    deudaTotal,
    totalPrestado,
    totalPagado,
    pct,
    cuotasTotales,
    cuotasPagadas,
    proximoVencimiento: proximo?.fechaVencimiento ?? null,
    proximoDescripcion: proximo?.descripcion ?? null,
    pagos,
    prestamosActivos:   activos.length,
    puntaje:            puntaje ?? null,
  }

  return <ClienteDashboardClient data={data} />
}