import { getPagos } from '@/lib/queries'
import PagosClient from './PagosClient'

export default async function PagosPage() {
  const pagos = await getPagos()

  const data = pagos.map(p => ({
    id:           p.id,
    prestamo_id:  p.prestamoId,
    cliente_id:   p.clienteId,
    monto:        p.monto,
    fecha_pago:   p.fechaPago,
    numero_cuota: p.numeroCuota,
    metodo_pago:  p.metodoPago,
    notas:        p.notas,
    created_at:   p.createdAt,
    clientes:     { nombre: p.cliente.nombre, apellido: p.cliente.apellido },
    prestamos:    { descripcion: p.prestamo.descripcion, monto_cuota: p.prestamo.montoCuota },
  }))

  return <PagosClient pagos={data} />
}