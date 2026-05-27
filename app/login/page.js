'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [mode, setMode] = useState('login')

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        router.push('/dashboard')
        router.refresh()
      } else {
        const { error } = await supabase.auth.signUp({ email, password })
        if (error) throw error
        setError('Check your email to confirm your account.')
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh', background: 'var(--bg)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      position: 'relative', overflow: 'hidden',
    }}>
      {/* Grid background */}
      <div style={{
        position: 'fixed', inset: 0, pointerEvents: 'none',
        backgroundImage: 'linear-gradient(rgba(0,87,255,0.03) 1px,transparent 1px),linear-gradient(90deg,rgba(0,87,255,0.03) 1px,transparent 1px)',
        backgroundSize: '40px 40px',
      }} />
      {/* Orb */}
      <div style={{
        position: 'fixed', top: '-100px', right: '-100px',
        width: '400px', height: '400px', borderRadius: '50%',
        background: 'rgba(0,87,255,0.05)', filter: 'blur(80px)', pointerEvents: 'none',
      }} />

      <div style={{
        background: 'var(--bg2)', border: '1px solid var(--border)',
        borderRadius: '20px', padding: '48px 40px', width: '100%', maxWidth: '420px',
        boxShadow: 'var(--shadow)', position: 'relative', zIndex: 1,
        animation: 'reveal .6s ease both',
      }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '36px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '8px' }}>
            <span style={{
              fontFamily: 'var(--font-display)', fontSize: '42px', fontWeight: '300',
              color: 'var(--blue)', lineHeight: 1, letterSpacing: '-2px',
              animation: 'logo-breathe 5s ease-in-out infinite',
            }}>L</span>
            <div style={{
              width: '8px', height: '8px', borderRadius: '50%',
              background: 'var(--blue)', marginTop: '6px',
              animation: 'dot-beat 2s ease-in-out infinite',
            }} />
          </div>
          <div style={{ fontSize: '10px', letterSpacing: '.25em', color: 'var(--text3)', textTransform: 'uppercase', fontWeight: 500 }}>
            Creative Director AI
          </div>
        </div>

        <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text)', marginBottom: '6px', textAlign: 'center' }}>
          {mode === 'login' ? 'Welcome back' : 'Create account'}
        </div>
        <div style={{ fontSize: '13px', color: 'var(--text3)', marginBottom: '28px', textAlign: 'center' }}>
          {mode === 'login' ? 'Sign in to your workspace' : 'Set up your Lumen workspace'}
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '14px' }}>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text2)', marginBottom: '6px', letterSpacing: '.05em', textTransform: 'uppercase' }}>
              Email
            </label>
            <input
              type="email" value={email} onChange={e => setEmail(e.target.value)}
              required placeholder="you@example.com"
              style={{
                width: '100%', padding: '11px 14px',
                background: 'var(--bg3)', border: '1.5px solid var(--border)',
                borderRadius: '10px', color: 'var(--text)',
                fontFamily: 'var(--font-ui)', fontSize: '14px', outline: 'none',
                transition: 'border-color .2s',
              }}
              onFocus={e => e.target.style.borderColor = 'rgba(0,87,255,0.4)'}
              onBlur={e => e.target.style.borderColor = 'var(--border)'}
            />
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text2)', marginBottom: '6px', letterSpacing: '.05em', textTransform: 'uppercase' }}>
              Password
            </label>
            <input
              type="password" value={password} onChange={e => setPassword(e.target.value)}
              required placeholder="••••••••"
              style={{
                width: '100%', padding: '11px 14px',
                background: 'var(--bg3)', border: '1.5px solid var(--border)',
                borderRadius: '10px', color: 'var(--text)',
                fontFamily: 'var(--font-ui)', fontSize: '14px', outline: 'none',
                transition: 'border-color .2s',
              }}
              onFocus={e => e.target.style.borderColor = 'rgba(0,87,255,0.4)'}
              onBlur={e => e.target.style.borderColor = 'var(--border)'}
            />
          </div>

          {error && (
            <div style={{
              padding: '10px 14px', borderRadius: '8px', marginBottom: '16px',
              background: error.includes('Check') ? 'rgba(34,204,136,0.08)' : 'rgba(255,60,60,0.08)',
              border: `1px solid ${error.includes('Check') ? 'rgba(34,204,136,0.2)' : 'rgba(255,60,60,0.2)'}`,
              color: error.includes('Check') ? '#22cc88' : '#ff3c3c',
              fontSize: '13px',
            }}>
              {error}
            </div>
          )}

          <button
            type="submit" disabled={loading}
            style={{
              width: '100%', padding: '12px',
              background: loading ? 'rgba(0,87,255,0.5)' : 'var(--blue)',
              color: '#fff', border: 'none', borderRadius: '10px',
              fontFamily: 'var(--font-ui)', fontSize: '13px', fontWeight: 700,
              letterSpacing: '.06em', textTransform: 'uppercase',
              boxShadow: 'var(--shadow-blue)', transition: 'all .2s',
            }}
          >
            {loading ? 'Please wait…' : mode === 'login' ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '20px', fontSize: '13px', color: 'var(--text3)' }}>
          {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
          <button
            onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError('') }}
            style={{ background: 'none', border: 'none', color: 'var(--blue)', fontWeight: 600, fontSize: '13px', cursor: 'pointer' }}
          >
            {mode === 'login' ? 'Sign up' : 'Sign in'}
          </button>
        </div>
      </div>
    </div>
  )
}
