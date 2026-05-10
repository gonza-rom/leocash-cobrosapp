import { prisma } from '@/lib/prisma'
import CobranzasClient from './CobranzasClient'

export default async function CobranzasPage() {
  const hoy = new Date()
  hoy.setHours(0, 0, 0, 0)

  const manana = new Date(hoy)
  manana.setDate(manana.getDate() + 1)

  const en7dias = new Date(hoy)
  en7dias.setDate(en7dias.getDate() + 7)

  const finMes = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0)
  finMes.setHours(23, 59, 59, 999)

  const prestamos = await prisma.prestamo.findMany({
    where: { estado: 'activo' },
    include: { cliente: { select: { id: true, nombre: true, apellido: true, telefono: true } } },
    orderBy: { fechaVencimiento: 'asc' },
  })

  const data = prestamos.map(p => {
    const venc = p.fechaVencimiento ? new Date(p.fechaVencimiento) : null
    const diasRestantes = venc
      ? Math.floor((venc.getTime() - hoy.getTime()) / 86400000)
      : null

    let estado: 'vencido' | 'hoy' | 'manana' | 'esta_semana' | 'este_mes' | 'futuro' | 'sin_fecha' = 'sin_fecha'

    if (diasRestantes !== null) {
      if (diasRestantes < 0)        estado = 'vencido'
      else if (diasRestantes === 0) estado = 'hoy'
      else if (diasRestantes === 1) estado = 'manana'
      else if (diasRestantes <= 7)  estado = 'esta_semana'
      else if (venc && venc <= finMes) estado = 'este_mes'
      else estado = 'futuro'
    }

    return {
      id:               p.id,
      clienteId:        p.clienteId,
      clienteNombre:    `${p.cliente.nombre} ${p.cliente.apellido}`,
      clienteTelefono:  p.cliente.telefono ?? '',
      descripcion:      p.descripcion,
      montoCuota:       Number(p.montoCuota),
      montoTotal:       Number(p.montoTotal),
      montoPagado:      Number(p.montoPagado),
      cuotasPagadas:    p.cuotasPagadas,
      cantidadCuotas:   p.cantidadCuotas,
      fechaVencimiento: p.fechaVencimiento?.toISOString() ?? null,
      diasRestantes,
      estadoCobranza:   estado,
      notas:            p.notas ?? '',
    }
  })

  return <CobranzasClient data={data} />
}