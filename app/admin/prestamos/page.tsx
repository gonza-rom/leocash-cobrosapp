import { getPrestamos } from '@/lib/queries'
import PrestamosClient from './PrestamosClient'

export default async function PrestamosPage() {
  const prestamos = await getPrestamos()

  const data = prestamos.map(p => ({
    id:               p.id,
    cliente_id:       p.clienteId,
    descripcion:      p.descripcion,
    monto_total:      p.montoTotal,
    monto_pagado:     p.montoPagado,
    monto_cuota:      p.montoCuota,
    cantidad_cuotas:  p.cantidadCuotas,
    cuotas_pagadas:   p.cuotasPagadas,
    fecha_inicio:     p.fechaInicio,
    fecha_vencimiento: p.fechaVencimiento,
    estado:           p.estado,
    notas:            p.notas,
    created_at:       p.createdAt,
    updated_at:       p.updatedAt,
    clientes: {
      nombre:   p.cliente.nombre,
      apellido: p.cliente.apellido,
      telefono: p.cliente.telefono,
    },
  }))

  return <PrestamosClient prestamos={data} />
}