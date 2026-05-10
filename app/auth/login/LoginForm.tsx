'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-browser'
import Image from 'next/image'

export default function LoginForm() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [verPass, setVerPass] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const supabase = createClient()

    // Si no tiene @ asume que es DNI y agrega el dominio ficticio
    const emailFinal = email.trim().includes('@') ? email.trim() : `${email.trim()}@leocash.com`

    const { data, error: authError } = await supabase.auth.signInWithPassword({
      email: emailFinal,
      password,
    })

    if (authError) {
      setError('DNI/email o contraseña incorrectos')
      setLoading(false)
      return
    }

    const { data: perfil } = await supabase
      .from('perfiles')
      .select('rol')
      .eq('id', data.user.id)
      .single()

    router.push(perfil?.rol === 'admin' ? '/admin' : '/cliente')
    router.refresh()
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1.5rem',
    }}>

      <div style={{
        position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0,
        background: 'radial-gradient(ellipse 70% 50% at 50% -10%, var(--accent-dim) 0%, transparent 70%)',
      }} />

      <div style={{
        width: '100%', maxWidth: 420,
        position: 'relative', zIndex: 1,
        animation: 'fadeUp 0.45s ease',
      }}>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '2rem' }}>
          <div style={{
            width: 200, height: 200, borderRadius: 24,
            background: 'white', boxShadow: '0 8px 32px var(--accent-dim)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            overflow: 'hidden', marginBottom: '1.125rem',
          }}>
            <Image src="/logo-leocash.png" alt="Leo Cash" width={200} height={200} style={{ objectFit: 'contain' }} priority />
          </div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 32, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.02em', lineHeight: 1, marginBottom: 8 }}>
            Leo Cash
          </h1>
          <p style={{ color: 'var(--text-2)', fontSize: 14, textAlign: 'center', lineHeight: 1.5 }}>
            Ingresá con tu cuenta para continuar
          </p>
        </div>

        <div style={{ background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '2rem', boxShadow: 'var(--shadow)' }}>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.125rem' }}>

            {/* DNI o Email */}
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text-3)', marginBottom: 7, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                DNI o Correo
              </label>
              <div style={{ position: 'relative' }}>
                <svg style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-3)', width: 16, height: 16, flexShrink: 0 }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <input
                  type="text"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  placeholder="Tu DNI o email"
                  autoComplete="username"
                  style={{
                    width: '100%', padding: '0.8rem 1rem 0.8rem 2.75rem',
                    background: 'var(--bg-3)', border: '1.5px solid var(--border)',
                    borderRadius: 'var(--radius-sm)', color: 'var(--text)',
                    fontSize: 14, outline: 'none', transition: 'border-color 0.2s, box-shadow 0.2s',
                    fontFamily: 'var(--font-body)',
                  }}
                  onFocus={e => { e.target.style.borderColor = 'var(--accent)'; e.target.style.boxShadow = '0 0 0 3px var(--accent-dim)' }}
                  onBlur={e => { e.target.style.borderColor = 'var(--border)'; e.target.style.boxShadow = 'none' }}
                />
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 5 }}>
                Clientes: ingresá tu número de DNI
              </div>
            </div>

            {/* Contraseña */}
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text-3)', marginBottom: 7, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Contraseña
              </label>
              <div style={{ position: 'relative' }}>
                <svg style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-3)', width: 16, height: 16 }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                <input
                  type={verPass ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  autoComplete="current-password"
                  style={{
                    width: '100%', padding: '0.8rem 3rem 0.8rem 2.75rem',
                    background: 'var(--bg-3)', border: '1.5px solid var(--border)',
                    borderRadius: 'var(--radius-sm)', color: 'var(--text)',
                    fontSize: 14, outline: 'none', transition: 'border-color 0.2s, box-shadow 0.2s',
                    fontFamily: 'var(--font-body)',
                  }}
                  onFocus={e => { e.target.style.borderColor = 'var(--accent)'; e.target.style.boxShadow = '0 0 0 3px var(--accent-dim)' }}
                  onBlur={e => { e.target.style.borderColor = 'var(--border)'; e.target.style.boxShadow = 'none' }}
                />
                <button type="button" onClick={() => setVerPass(!verPass)} style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', padding: 2, display: 'flex' }}>
                  {verPass ? (
                    <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {error && (
              <div style={{ padding: '0.75rem 1rem', background: 'var(--red-dim)', border: '1px solid rgba(186,26,26,0.25)', borderRadius: 'var(--radius-sm)', color: 'var(--red)', fontSize: 13 }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%', padding: '0.875rem',
                background: loading ? 'var(--bg-4)' : 'var(--accent)',
                color: loading ? 'var(--text-3)' : '#fff',
                border: 'none', borderRadius: 'var(--radius-sm)',
                fontSize: 15, fontWeight: 600,
                cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s', fontFamily: 'var(--font-body)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                marginTop: 4,
                boxShadow: loading ? 'none' : '0 4px 20px var(--accent-dim)',
              }}
            >
              {loading && (
                <div className="spinner" style={{ width: 16, height: 16, borderColor: 'rgba(255,255,255,0.3)', borderTopColor: '#fff' }} />
              )}
              {loading ? 'Ingresando...' : 'Ingresar'}
            </button>
          </form>
        </div>

        <div style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-3)' }}>
            <svg width="12" height="12" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z" />
            </svg>
            <span style={{ fontSize: 10, letterSpacing: '0.09em', textTransform: 'uppercase', fontWeight: 700 }}>
              Conexión segura
            </span>
          </div>
          <p style={{ color: 'var(--text-3)', fontSize: 16, textAlign: 'center' }}>
            © 2026 Leo Cash · Sistema privado
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: 'var(--text-3)' }}>
            <span style={{ fontSize: 14 }}>Desarrollado por</span>
            <a href="https://www.devhub.com.ar/" target="_blank" rel="noopener noreferrer" style={{ fontSize: 10, fontWeight: 700, color: 'var(--accent)', textDecoration: 'none', letterSpacing: '0.02em' }}>
              DevHub
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}