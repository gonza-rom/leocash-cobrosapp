import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import ClienteNav from './ClienteNav'

export default async function ClienteLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/auth/login')

  const { data: perfil } = await supabase.from('perfiles').select('*').eq('id', user.id).single()
  const { data: cliente } = await supabase.from('clientes').select('*').eq('user_id', user.id).single()

  if (!cliente) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 24, marginBottom: 8 }}>Cuenta no encontrada</div>
          <p style={{ color: 'var(--text-2)', fontSize: 14 }}>Tu cuenta no está vinculada a ningún cliente. Contactá al administrador.</p>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <ClienteNav perfil={perfil} cliente={cliente} />
      <main style={{ maxWidth: 800, margin: '0 auto', padding: '1.5rem 1rem' }}>
        {children}
      </main>
    </div>
  )
}
