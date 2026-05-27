'use client'
import { usePathname, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function Sidebar({ projectId, projectName, client }) {
  const pathname = usePathname()
  const router = useRouter()

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const base = `/project/${projectId}`
  const navItems = [
    { href: base, label: 'Brand Vault', icon: '🏛', key: 'vault' },
    { href: `${base}/brainstorm`, label: 'Brainstorm', icon: '⚡', key: 'brainstorm' },
    { href: `${base}/references`, label: 'References', icon: '🎨', key: 'references' },
    { href: `${base}/prompts`, label: 'Prompt Builder', icon: '✦', key: 'prompts' },
  ]

  return (
    <aside style={{
      width: '248px', flexShrink: 0,
      background: 'var(--bg2)', borderRight: '1px solid var(--border)',
      display: 'flex', flexDirection: 'column', height: '100vh',
      position: 'sticky', top: 0,
    }}>
      {/* Logo */}
      <div style={{ padding: '28px 24px 22px', borderBottom: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '5px' }}>
          <span style={{
            fontFamily: 'var(--font-display)', fontSize: '36px', fontWeight: 300,
            color: 'var(--blue)', lineHeight: 1, letterSpacing: '-2px',
            animation: 'logo-breathe 5s ease-in-out infinite',
          }}>L</span>
          <div style={{
            width: '7px', height: '7px', borderRadius: '50%',
            background: 'var(--blue)', marginTop: '4px',
            animation: 'dot-beat 2s ease-in-out infinite',
          }} />
        </div>
        <div style={{ fontSize: '9px', letterSpacing: '.25em', color: 'var(--text3)', textTransform: 'uppercase', fontWeight: 500 }}>
          Creative Director AI
        </div>
      </div>

      {/* Project pill */}
      <div style={{ padding: '16px 16px 0' }}>
        <div style={{ fontSize: '9px', letterSpacing: '.2em', color: 'var(--text3)', textTransform: 'uppercase', fontWeight: 600, marginBottom: '8px', padding: '0 8px' }}>
          Active Project
        </div>
        <div style={{
          padding: '10px 14px', background: 'var(--blue-light)',
          border: '1px solid rgba(0,87,255,0.15)', borderRadius: '10px',
          color: 'var(--blue)', fontSize: '13px', fontWeight: 500,
        }}>
          {projectName || 'Untitled Project'}
          {client && <div style={{ fontSize: '11px', color: 'var(--text3)', marginTop: '2px' }}>{client}</div>}
        </div>
      </div>

      {/* Nav */}
      <nav style={{ padding: '20px 16px', flex: 1 }}>
        <div style={{ fontSize: '9px', letterSpacing: '.2em', color: 'var(--text3)', textTransform: 'uppercase', fontWeight: 600, marginBottom: '8px', padding: '0 8px' }}>
          Modules
        </div>
        {navItems.map(item => {
          const isActive = pathname === item.href
          return (
            <a key={item.key} href={item.href} style={{
              display: 'flex', alignItems: 'center', gap: '12px',
              padding: '10px 12px', borderRadius: '10px',
              border: `1px solid ${isActive ? 'rgba(0,87,255,0.15)' : 'transparent'}`,
              background: isActive ? 'var(--blue-light)' : 'transparent',
              color: isActive ? 'var(--blue)' : 'var(--text2)',
              fontSize: '13px', fontWeight: 500,
              marginBottom: '3px', transition: 'all .2s',
              textDecoration: 'none', position: 'relative',
            }}>
              {isActive && (
                <div style={{
                  position: 'absolute', left: 0, top: '20%', bottom: '20%',
                  width: '3px', borderRadius: '0 3px 3px 0', background: 'var(--blue)',
                }} />
              )}
              <div style={{
                width: '32px', height: '32px', borderRadius: '8px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '15px', flexShrink: 0,
                background: isActive ? 'rgba(0,87,255,0.12)' : 'var(--bg3)',
              }}>
                {item.icon}
              </div>
              {item.label}
            </a>
          )
        })}

        <div style={{ fontSize: '9px', letterSpacing: '.2em', color: 'var(--text3)', textTransform: 'uppercase', fontWeight: 600, margin: '20px 0 8px', padding: '0 8px' }}>
          Workspace
        </div>
        <a href="/dashboard" style={{
          display: 'flex', alignItems: 'center', gap: '12px',
          padding: '10px 12px', borderRadius: '10px', border: '1px solid transparent',
          color: 'var(--text2)', fontSize: '13px', fontWeight: 500,
          marginBottom: '3px', transition: 'all .2s', textDecoration: 'none',
        }}>
          <div style={{ width: '32px', height: '32px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '15px', background: 'var(--bg3)' }}>📁</div>
          All Projects
        </a>
      </nav>

      {/* Status + signout */}
      <div style={{ borderTop: '1px solid var(--border)', padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '7px', fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--text3)' }}>
          <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#22cc88', animation: 'dot-beat 2s ease-in-out infinite' }} />
          Claude active
        </div>
        <button onClick={handleSignOut} style={{
          background: 'none', border: 'none', fontSize: '11px',
          color: 'var(--text3)', cursor: 'pointer', fontFamily: 'var(--font-ui)',
        }}>
          Sign out
        </button>
      </div>
    </aside>
  )
}
