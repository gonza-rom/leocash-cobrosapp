import { createClient } from '@/lib/supabase-server'
import PuntosConfigClient from './PuntosConfigClient'
import { prisma } from '@/lib/prisma'

export default async function PuntosPage() {
  const supabase = await createClient()
  const { data: config } = await supabase.from('config_puntos').select('*').single()

  const puntajes = await supabase
    .from('puntajes')
    .select('*, clientes(nombre, apellido)')
    .order('puntos_actual', { ascending: false })

  return <PuntosConfigClient config={config} puntajes={puntajes.data ?? []} />
}