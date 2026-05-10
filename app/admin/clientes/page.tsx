import { getClientes } from '@/lib/queries'
import ClientesClient from './ClientesClient'

export default async function ClientesPage() {
  const clientes = await getClientes()

  const clientesConDeuda = clientes.map(c => {
    const activos = c.prestamos.filter(p => p.estado === 'activo')
    const deuda = activos.reduce((s, p) => s + (p.montoTotal - p.montoPagado), 0)
    return {
      id:               c.id,
      user_id:          c.userId ?? undefined,
      nombre:           c.nombre,
      apellido:         c.apellido,
      telefono:         c.telefono ?? undefined,
      email:            c.email ?? undefined,
      dni:              c.dni ?? undefined,
      direccion:        c.direccion ?? undefined,
      notas:            c.notas ?? undefined,
      activo:           c.activo,
      foto_dni_url:     c.fotoDniUrl ?? undefined,
      created_at:       c.createdAt,
      updated_at:       c.updatedAt,
      deuda_total:      deuda,
      prestamos_activos: activos.length,
    }
  })

  return (
    <div style={{ animation: 'fadeUp 0.4s ease' }}>
      <ClientesClient clientes={clientesConDeuda} />
    </div>
  )
}