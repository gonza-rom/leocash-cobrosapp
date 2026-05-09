import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'

export default async function ClienteLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/auth/login')

  const { data: cliente } = await supabase
    .from('clientes')
    .select('*')
    .eq('user_id', user.id)
    .single()

  if (!cliente) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 24, marginBottom: 8, color: 'var(--text)' }}>
            Cuenta no encontrada
          </div>
          <p style={{ color: 'var(--text-2)', fontSize: 14 }}>
            Tu cuenta no está vinculada a ningún cliente. Contactá al administrador.
          </p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}