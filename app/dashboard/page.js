'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function Dashboard() {
  const router = useRouter()
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [newClient, setNewClient] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [user, setUser] = useState(null)

  useEffect(() => {
    checkAuth()
    fetchProjects()
  }, [])

  async function checkAuth() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.push('/login'); return }
    setUser(session.user)
  }

  async function fetchProjects() {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .order('created_at', { ascending: false })
    if (!error) setProjects(data || [])
    setLoading(false)
  }

  async function createProject(e) {
    e.preventDefault()
    if (!newName.trim()) return
    setCreating(true)
    const { data: { user } } = await supabase.auth.getUser()
    const { data, error } = await supabase
      .from('projects')
      .insert({ name: newName.trim(), client: newClient.trim(), user_id: user.id })
      .select()
      .single()
    if (!error && data) {
      router.push(`/project/${data.id}`)
    }
    setCreating(false)
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', position: 'relative' }}>
      {/* Grid bg */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', backgroundImage: 'linear-gradient(rgba(0,87,255,0.03) 1px,transparent 1px),linear-gradient(90deg,rgba(0,87,255,0.03) 1px,transparent 1px)', backgroundSize: '40px 40px' }} />

      {/* Top bar */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 10,
        background: 'rgba(248,248,252,0.9)', backdropFilter: 'blur(20px)',
        borderBottom: '1px solid var(--border)',
        padding: '16px 40px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        animation: 'slide-down .5s ease both',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: '28px', fontWeight: 300, color: 'var(--blue)', lineHeight: 1, letterSpacing: '-1px', animation: 'logo-breathe 5s ease-in-out infinite' }}>L</span>
          <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--blue)', animation: 'dot-beat 2s ease-in-out infinite' }} />
          <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text)', marginLeft: '4px' }}>Lumen</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '12px', color: 'var(--text3)', fontFamily: 'var(--font-mono)' }}>{user?.email}</span>
          <button onClick={() => supabase.auth.signOut().then(() => router.push('/login'))}
            style={{ background: 'none', border: '1px solid var(--border2)', padding: '6px 14px', borderRadius: '8px', fontSize: '12px', color: 'var(--text2)', cursor: 'pointer', fontFamily: 'var(--font-ui)' }}>
            Sign out
          </button>
        </div>
      </div>

      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '48px 40px', position: 'relative', zIndex: 1 }}>

        {/* Header */}
        <div style={{ marginBottom: '40px', animation: 'reveal .6s ease both' }}>
          <div style={{ fontSize: '13px', fontFamily: 'var(--font-mono)', color: 'var(--text3)', letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: '10px' }}>Workspace</div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '48px', fontWeight: 300, color: 'var(--text)', letterSpacing: '-1px', lineHeight: 1.1 }}>
            Your Projects
          </h1>
        </div>

        {/* New project form */}
        {showForm ? (
          <div style={{ background: 'var(--bg2)', border: '1.5px solid rgba(0,87,255,0.2)', borderRadius: '16px', padding: '28px', marginBottom: '32px', boxShadow: 'var(--shadow-blue)', animation: 'reveal .4s ease both' }}>
            <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text)', marginBottom: '20px' }}>New Project</div>
            <form onSubmit={createProject}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '20px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text2)', marginBottom: '6px', letterSpacing: '.05em', textTransform: 'uppercase' }}>Project Name *</label>
                  <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="e.g. Summer Campaign 2025" required
                    style={{ width: '100%', padding: '10px 14px', background: 'var(--bg3)', border: '1.5px solid var(--border)', borderRadius: '10px', color: 'var(--text)', fontFamily: 'var(--font-ui)', fontSize: '14px', outline: 'none' }}
                    onFocus={e => e.target.style.borderColor = 'rgba(0,87,255,0.4)'}
                    onBlur={e => e.target.style.borderColor = 'var(--border)'}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text2)', marginBottom: '6px', letterSpacing: '.05em', textTransform: 'uppercase' }}>Client</label>
                  <input value={newClient} onChange={e => setNewClient(e.target.value)} placeholder="e.g. Nike"
                    style={{ width: '100%', padding: '10px 14px', background: 'var(--bg3)', border: '1.5px solid var(--border)', borderRadius: '10px', color: 'var(--text)', fontFamily: 'var(--font-ui)', fontSize: '14px', outline: 'none' }}
                    onFocus={e => e.target.style.borderColor = 'rgba(0,87,255,0.4)'}
                    onBlur={e => e.target.style.borderColor = 'var(--border)'}
                  />
                </div>
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button type="submit" disabled={creating} style={{ padding: '10px 24px', background: 'var(--blue)', color: '#fff', border: 'none', borderRadius: '10px', fontFamily: 'var(--font-ui)', fontSize: '13px', fontWeight: 700, letterSpacing: '.05em', textTransform: 'uppercase', boxShadow: 'var(--shadow-blue)', cursor: 'pointer' }}>
                  {creating ? 'Creating…' : 'Create Project'}
                </button>
                <button type="button" onClick={() => setShowForm(false)} style={{ padding: '10px 20px', background: 'transparent', border: '1px solid var(--border2)', borderRadius: '10px', fontFamily: 'var(--font-ui)', fontSize: '13px', color: 'var(--text2)', cursor: 'pointer' }}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        ) : (
          <button onClick={() => setShowForm(true)} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '14px 20px', background: 'var(--bg2)', border: '1.5px dashed rgba(0,87,255,0.2)', borderRadius: '14px', marginBottom: '32px', cursor: 'pointer', color: 'var(--blue)', fontSize: '13px', fontWeight: 600, transition: 'all .2s', width: '100%', fontFamily: 'var(--font-ui)', animation: 'reveal .6s .1s ease both', opacity: 0 }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(0,87,255,0.45)'; e.currentTarget.style.background = 'var(--blue-light)' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(0,87,255,0.2)'; e.currentTarget.style.background = 'var(--bg2)' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '9px', background: 'var(--blue-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>+</div>
            New Project
          </button>
        )}

        {/* Projects grid */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text3)', fontFamily: 'var(--font-mono)', fontSize: '13px' }}>Loading projects…</div>
        ) : projects.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 40px', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '20px' }}>
            <div style={{ fontSize: '40px', marginBottom: '16px' }}>✦</div>
            <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text)', marginBottom: '8px' }}>No projects yet</div>
            <div style={{ fontSize: '14px', color: 'var(--text3)' }}>Create your first project to get started</div>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(260px,1fr))', gap: '16px' }}>
            {projects.map((p, i) => (
              <a key={p.id} href={`/project/${p.id}`} style={{
                background: 'var(--bg2)', border: '1px solid var(--border)',
                borderRadius: '16px', padding: '24px',
                transition: 'all .25s', textDecoration: 'none',
                display: 'block', boxShadow: 'var(--shadow)',
                animation: `reveal .5s ${i * 0.08}s ease both`, opacity: 0,
              }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = 'var(--shadow-hover)'; e.currentTarget.style.borderColor = 'rgba(0,87,255,0.2)' }}
                onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = 'var(--shadow)'; e.currentTarget.style.borderColor = 'var(--border)' }}>
                <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'var(--blue-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', marginBottom: '16px' }}>✦</div>
                <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text)', marginBottom: '4px' }}>{p.name}</div>
                {p.client && <div style={{ fontSize: '12px', color: 'var(--text3)', marginBottom: '16px' }}>{p.client}</div>}
                <div style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--text3)', paddingTop: '14px', borderTop: '1px solid var(--border)' }}>
                  {new Date(p.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                </div>
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
