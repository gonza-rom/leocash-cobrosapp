import { createClient as createAdminClient } from '@supabase/supabase-js'
import { unstable_cache } from 'next/cache'
import PuntosConfigClient from './PuntosConfigClient'

const getPuntosData = unstable_cache(
  async () => {
    const admin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const [{ data: config }, { data: puntajesRaw }, { data: historial }] = await Promise.all([
      admin.from('config_puntos').select('*').single(),
      admin.from('puntajes').select('*, clientes(nombre, apellido)').order('updated_at', { ascending: false }),
      admin.from('historial_puntos').select('*, clientes(nombre, apellido)').order('created_at', { ascending: false }).limit(50),
    ])

    return { config, puntajesRaw: puntajesRaw ?? [], historial: historial ?? [] }
  },
  ['puntos-data'],
  { revalidate: 30 }
)

function calcularEstado(puntos: number): string {
  if (puntos >= 150) return 'vip'
  if (puntos >= 110) return 'cumplidor'
  if (puntos >= 80)  return 'observacion'
  if (puntos > 0)    return 'moroso'
  return 'bloqueado'
}

export default async function PuntosPage() {
  const { config, puntajesRaw, historial } = await getPuntosData()

  const puntajesPorCliente = new Map<string, any>()
  for (const p of puntajesRaw) {
    const existente = puntajesPorCliente.get(p.cliente_id)
    if (!existente) {
      puntajesPorCliente.set(p.cliente_id, p)
    } else {
      const total = (existente.puntos_actual ?? 0) + (p.puntos_actual ?? 0) - (p.puntos_base ?? 100)
      puntajesPorCliente.set(p.cliente_id, {
        ...existente,
        puntos_actual: total,
        estado: calcularEstado(total),
      })
    }
  }

  const puntajes = Array.from(puntajesPorCliente.values())
    .sort((a, b) => b.puntos_actual - a.puntos_actual)

  return <PuntosConfigClient config={config} puntajes={puntajes} historial={historial} />
}