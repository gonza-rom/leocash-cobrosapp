import { createClient } from '@/lib/supabase-server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  // Verificar que el que llama es admin
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { data: perfil } = await supabase.from('perfiles').select('rol').eq('id', user.id).single()
  if (perfil?.rol !== 'admin') return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const { clienteId, email, password, nombre } = await request.json()

  // Usar service_role para crear usuarios
  const adminSupabase = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Crear usuario en Auth
  const { data: newUser, error: authError } = await adminSupabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { nombre, rol: 'cliente' },
  })

  if (authError) return NextResponse.json({ error: authError.message }, { status: 400 })

  // Vincular usuario al cliente
  const { error: updateError } = await adminSupabase
    .from('clientes')
    .update({ user_id: newUser.user.id })
    .eq('id', clienteId)

  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 400 })

  // Crear perfil con rol cliente
  await adminSupabase.from('perfiles').upsert({
    id: newUser.user.id,
    nombre,
    email,
    rol: 'cliente',
  })

  return NextResponse.json({ userId: newUser.user.id })
}