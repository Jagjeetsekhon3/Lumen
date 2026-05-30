'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

const CAMPAIGN_TYPES = ['Campaign', 'Design', 'Video', 'Seasonal', 'Social Media', 'Launch', 'Other']

export default function Dashboard() {
  const router = useRouter()
  const [projects, setProjects] = useState([])
  const [brands, setBrands] = useState([])
  const [loading, setLoading] = useState(true)
  const [newName, setNewName] = useState('')
  const [newBrandId, setNewBrandId] = useState('')
  const [newType, setNewType] = useState('Campaign')
  const [showForm, setShowForm] = useState(false)
  const [creating, setCreating] = useState(false)
  const [user, setUser] = useState(null)
  const [showGuide, setShowGuide] = useState(false)
  const [deletingId, setDeletingId] = useState(null)
  const [filterBrand, setFilterBrand] = useState('all')

  useEffect(() => { checkAuth(); fetchAll() }, [])

  async function checkAuth() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.push('/login'); return }
    setUser(session.user)
  }

  async function fetchAll() {
    const [{ data: proj }, { data: brandData }] = await Promise.all([
      supabase.from('projects').select('*, brands(name)').order('created_at', { ascending: false }),
      supabase.from('brands').select('*').order('name'),
    ])
    setProjects(proj || [])
    setBrands(brandData || [])
    setLoading(false)
  }

  async function createProject(e) {
    e.preventDefault()
    if (!newName.trim()) return
    setCreating(true)
    const { data: { user } } = await supabase.auth.getUser()
    const { data, error } = await supabase.from('projects').insert({
      name: newName.trim(),
      brand_id: newBrandId || null,
      campaign_type: newType,
      user_id: user.id,
    }).select().single()
    if (!error && data) router.push(`/project/${data.id}`)
    setCreating(false)
  }

  async function deleteProject(projectId, e) {
    e.preventDefault(); e.stopPropagation()
    if (!confirm('Delete this campaign? Cannot be undone.')) return
    setDeletingId(projectId)
    await supabase.from('generated_prompts').delete().eq('project_id', projectId)
    await supabase.from('reference_images').delete().eq('project_id', projectId)
    const { data: sessions } = await supabase.from('brainstorm_sessions').select('id').eq('project_id', projectId)
    if (sessions?.length) await supabase.from('brainstorm_ideas').delete().in('session_id', sessions.map(s => s.id))
    await supabase.from('brainstorm_sessions').delete().eq('project_id', projectId)
    await supabase.from('approved_posts').delete().eq('project_id', projectId)
    await supabase.from('brand_summaries').delete().eq('project_id', projectId)
    await supabase.from('projects').delete().eq('id', projectId)
    setDeletingId(null)
    fetchAll()
  }

  const filtered = filterBrand === 'all' ? projects : projects.filter(p => p.brand_id === filterBrand)

  const GUIDE_STEPS = [
    { icon: '🏢', title: 'Create a Brand', desc: 'Go to Brands and create a profile for each client. Upload guidelines once — all campaigns under that brand share the context automatically.' },
    { icon: '📁', title: 'Create a Campaign', desc: 'Back on Dashboard, create a campaign and select the brand. Name it — Summer 2025, Tropical, Winter, etc.' },
    { icon: '⚡', title: 'Brainstorm Ideas', desc: 'Paste your brief or script from the copy team. Lumen generates territories, taglines, and concepts filtered through brand context.' },
    { icon: '🎨', title: 'Build Reference Board', desc: 'Upload images or paste Pinterest/Behance URLs. Tag each — typography, background, product, color. Auto-extract a visual brief.' },
    { icon: '✦', title: 'Generate AI Prompts', desc: 'Select your tool — Midjourney, Kling, ChatGPT etc. Lumen builds a tool-specific prompt with brand + references + idea baked in.' },
    { icon: '⬡', title: 'Full Design Generation', desc: 'Use the Full Design tab to generate a complete ChatGPT prompt — product, background, typography, copy all in one shot.' },
  ]

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', backgroundImage: 'linear-gradient(rgba(0,87,255,0.03) 1px,transparent 1px),linear-gradient(90deg,rgba(0,87,255,0.03) 1px,transparent 1px)', backgroundSize: '40px 40px' }} />

      {/* Topbar */}
      <div style={{ position: 'sticky', top: 0, zIndex: 10, background: 'rgba(248,248,252,0.9)', backdropFilter: 'blur(20px)', borderBottom: '1px solid var(--border)', padding: '14px 40px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', animation: 'slide-down .5s ease both' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: '26px', fontWeight: 300, color: 'var(--blue)', lineHeight: 1, letterSpacing: '-1px', animation: 'logo-breathe 5s ease-in-out infinite' }}>L</span>
            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--blue)', animation: 'dot-beat 2s ease-in-out infinite' }} />
            <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text)', marginLeft: '2px' }}>Lumen</span>
          </div>
          <div style={{ width: '1px', height: '20px', background: 'var(--border)' }} />
          <a href="/brands"
            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '12px', fontWeight: 600, color: 'var(--text2)', textDecoration: 'none', transition: 'all .2s' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(0,87,255,0.2)'; e.currentTarget.style.color = 'var(--blue)'; e.currentTarget.style.background = 'var(--blue-light)' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text2)'; e.currentTarget.style.background = 'var(--bg3)' }}>
            🏢 Manage Brands
            {brands.length > 0 && <span style={{ padding: '1px 6px', borderRadius: '10px', background: 'var(--blue-light)', color: 'var(--blue)', fontSize: '10px', fontFamily: 'var(--font-mono)' }}>{brands.length}</span>}
          </a>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button onClick={() => setShowGuide(true)}
            style={{ padding: '7px 14px', background: 'var(--blue-light)', border: '1px solid rgba(0,87,255,0.2)', borderRadius: '8px', fontSize: '12px', fontWeight: 600, color: 'var(--blue)', cursor: 'pointer', fontFamily: 'var(--font-ui)' }}>
            ? How to Use
          </button>
          <span style={{ fontSize: '11px', color: 'var(--text3)', fontFamily: 'var(--font-mono)' }}>{user?.email}</span>
          <button onClick={() => supabase.auth.signOut().then(() => router.push('/login'))}
            style={{ background: 'none', border: '1px solid var(--border2)', padding: '6px 12px', borderRadius: '8px', fontSize: '12px', color: 'var(--text2)', cursor: 'pointer', fontFamily: 'var(--font-ui)' }}>
            Sign out
          </button>
        </div>
      </div>

      {/* How to Use Modal */}
      {showGuide && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', backdropFilter: 'blur(4px)' }} onClick={() => setShowGuide(false)}>
          <div onClick={e => e.stopPropagation()} style={{ background: 'var(--bg2)', borderRadius: '20px', padding: '36px', maxWidth: '640px', width: '100%', maxHeight: '85vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.2)', border: '1px solid var(--border)', animation: 'reveal .3s ease both' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '28px', fontWeight: 300, color: 'var(--text)', letterSpacing: '-.5px', marginBottom: '4px' }}>How to Use Lumen</div>
            <div style={{ fontSize: '13px', color: 'var(--text3)', marginBottom: '24px' }}>Your AI-powered Creative Director</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {GUIDE_STEPS.map((step, i) => (
                <div key={i} style={{ display: 'flex', gap: '14px', padding: '14px 16px', background: 'var(--bg3)', borderRadius: '12px', border: '1px solid var(--border)', alignItems: 'flex-start' }}>
                  <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'var(--blue-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', flexShrink: 0 }}>{step.icon}</div>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)', marginBottom: '3px' }}>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--blue)', marginRight: '8px' }}>0{i + 1}</span>{step.title}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text2)', lineHeight: 1.6 }}>{step.desc}</div>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: '16px', padding: '14px 16px', background: 'var(--blue-light)', borderRadius: '12px', border: '1px solid rgba(0,87,255,0.2)' }}>
              <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--blue)', marginBottom: '3px' }}>💡 Pro tip</div>
              <div style={{ fontSize: '12px', color: 'var(--text2)', lineHeight: 1.6 }}>Set up your brand once, run unlimited campaigns under it. Summer, Tropical, Winter — all share the same brand context automatically.</div>
            </div>
            <button onClick={() => setShowGuide(false)} style={{ width: '100%', marginTop: '16px', padding: '12px', background: 'var(--blue)', color: '#fff', border: 'none', borderRadius: '10px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', letterSpacing: '.05em', textTransform: 'uppercase', boxShadow: 'var(--shadow-blue)', fontFamily: 'var(--font-ui)' }}>
              Got it — Let's Create
            </button>
          </div>
        </div>
      )}

      <div style={{ maxWidth: '960px', margin: '0 auto', padding: '40px', position: 'relative', zIndex: 1 }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: '32px', animation: 'reveal .6s ease both', opacity: 0 }}>
          <div>
            <div style={{ fontSize: '12px', fontFamily: 'var(--font-mono)', color: 'var(--text3)', letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: '8px' }}>Campaigns</div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '42px', fontWeight: 300, color: 'var(--text)', letterSpacing: '-1px', lineHeight: 1 }}>Your Campaigns</h1>
          </div>
          {/* Brand filter */}
          {brands.length > 0 && (
            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
              <span style={{ fontSize: '11px', color: 'var(--text3)', fontFamily: 'var(--font-mono)' }}>Filter:</span>
              <button onClick={() => setFilterBrand('all')}
                style={{ padding: '6px 12px', borderRadius: '8px', border: `1px solid ${filterBrand === 'all' ? 'rgba(0,87,255,0.3)' : 'var(--border)'}`, background: filterBrand === 'all' ? 'var(--blue-light)' : 'var(--bg2)', color: filterBrand === 'all' ? 'var(--blue)' : 'var(--text2)', fontSize: '12px', fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-ui)' }}>
                All
              </button>
              {brands.map(b => (
                <button key={b.id} onClick={() => setFilterBrand(b.id)}
                  style={{ padding: '6px 12px', borderRadius: '8px', border: `1px solid ${filterBrand === b.id ? 'rgba(0,87,255,0.3)' : 'var(--border)'}`, background: filterBrand === b.id ? 'var(--blue-light)' : 'var(--bg2)', color: filterBrand === b.id ? 'var(--blue)' : 'var(--text2)', fontSize: '12px', fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-ui)' }}>
                  {b.name}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* New campaign form */}
        {showForm ? (
          <div style={{ background: 'var(--bg2)', border: '1.5px solid rgba(0,87,255,0.2)', borderRadius: '16px', padding: '28px', marginBottom: '28px', boxShadow: 'var(--shadow-blue)', animation: 'reveal .4s ease both', opacity: 0 }}>
            <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text)', marginBottom: '20px' }}>New Campaign</div>
            <form onSubmit={createProject}>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '14px', marginBottom: '20px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text2)', marginBottom: '6px', letterSpacing: '.05em', textTransform: 'uppercase' }}>Campaign Name *</label>
                  <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="e.g. Summer 2025" required
                    style={{ width: '100%', padding: '10px 14px', background: 'var(--bg3)', border: '1.5px solid var(--border)', borderRadius: '10px', color: 'var(--text)', fontFamily: 'var(--font-ui)', fontSize: '14px', outline: 'none' }}
                    onFocus={e => e.target.style.borderColor = 'rgba(0,87,255,0.4)'}
                    onBlur={e => e.target.style.borderColor = 'var(--border)'} autoFocus />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text2)', marginBottom: '6px', letterSpacing: '.05em', textTransform: 'uppercase' }}>Brand</label>
                  <select value={newBrandId} onChange={e => setNewBrandId(e.target.value)}
                    style={{ width: '100%', padding: '10px 14px', background: 'var(--bg3)', border: '1.5px solid var(--border)', borderRadius: '10px', color: newBrandId ? 'var(--text)' : 'var(--text3)', fontFamily: 'var(--font-ui)', fontSize: '13px', outline: 'none', cursor: 'pointer' }}>
                    <option value="">No brand</option>
                    {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text2)', marginBottom: '6px', letterSpacing: '.05em', textTransform: 'uppercase' }}>Type</label>
                  <select value={newType} onChange={e => setNewType(e.target.value)}
                    style={{ width: '100%', padding: '10px 14px', background: 'var(--bg3)', border: '1.5px solid var(--border)', borderRadius: '10px', color: 'var(--text)', fontFamily: 'var(--font-ui)', fontSize: '13px', outline: 'none', cursor: 'pointer' }}>
                    {CAMPAIGN_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>
              {!newBrandId && brands.length > 0 && (
                <div style={{ padding: '10px 14px', background: 'rgba(255,180,0,0.08)', border: '1px solid rgba(255,180,0,0.2)', borderRadius: '8px', fontSize: '12px', color: '#b87c00', marginBottom: '16px' }}>
                  💡 Select a brand to automatically load brand context into all modules
                </div>
              )}
              {brands.length === 0 && (
                <div style={{ padding: '10px 14px', background: 'var(--blue-light)', border: '1px solid rgba(0,87,255,0.15)', borderRadius: '8px', fontSize: '12px', color: 'var(--blue)', marginBottom: '16px' }}>
                  💡 <a href="/brands" style={{ color: 'var(--blue)', fontWeight: 600 }}>Create a brand first</a> to link your guidelines to this campaign
                </div>
              )}
              <div style={{ display: 'flex', gap: '10px' }}>
                <button type="submit" disabled={creating}
                  style={{ padding: '10px 24px', background: 'var(--blue)', color: '#fff', border: 'none', borderRadius: '10px', fontFamily: 'var(--font-ui)', fontSize: '13px', fontWeight: 700, letterSpacing: '.05em', textTransform: 'uppercase', boxShadow: 'var(--shadow-blue)', cursor: 'pointer' }}>
                  {creating ? 'Creating…' : 'Create Campaign'}
                </button>
                <button type="button" onClick={() => setShowForm(false)}
                  style={{ padding: '10px 20px', background: 'transparent', border: '1px solid var(--border2)', borderRadius: '10px', fontFamily: 'var(--font-ui)', fontSize: '13px', color: 'var(--text2)', cursor: 'pointer' }}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        ) : (
          <button onClick={() => setShowForm(true)}
            style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '14px 20px', background: 'var(--bg2)', border: '1.5px dashed rgba(0,87,255,0.2)', borderRadius: '14px', marginBottom: '28px', cursor: 'pointer', color: 'var(--blue)', fontSize: '13px', fontWeight: 600, transition: 'all .2s', width: '100%', fontFamily: 'var(--font-ui)', animation: 'reveal .6s .1s ease both', opacity: 0 }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(0,87,255,0.45)'; e.currentTarget.style.background = 'var(--blue-light)' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(0,87,255,0.2)'; e.currentTarget.style.background = 'var(--bg2)' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '9px', background: 'var(--blue-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>+</div>
            New Campaign
          </button>
        )}

        {/* Projects grid */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text3)', fontFamily: 'var(--font-mono)', fontSize: '13px' }}>Loading…</div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 40px', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '20px' }}>
            <div style={{ fontSize: '40px', marginBottom: '14px' }}>✦</div>
            <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text)', marginBottom: '8px' }}>{projects.length === 0 ? 'No campaigns yet' : 'No campaigns for this brand'}</div>
            <div style={{ fontSize: '13px', color: 'var(--text3)', marginBottom: '20px' }}>{projects.length === 0 ? 'Create your first campaign to get started' : 'Create a new campaign under this brand'}</div>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(260px,1fr))', gap: '16px' }}>
            {filtered.map((p, i) => (
              <div key={p.id} style={{ position: 'relative', animation: `reveal .5s ${i * 0.07}s ease both`, opacity: 0 }}>
                <a href={`/project/${p.id}`}
                  style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '16px', padding: '22px', transition: 'all .25s', textDecoration: 'none', display: 'block', boxShadow: 'var(--shadow)' }}
                  onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = 'var(--shadow-hover)'; e.currentTarget.style.borderColor = 'rgba(0,87,255,0.2)' }}
                  onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = 'var(--shadow)'; e.currentTarget.style.borderColor = 'var(--border)' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '14px' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'var(--blue-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>✦</div>
                    <span style={{ padding: '3px 9px', borderRadius: '6px', background: 'var(--bg3)', border: '1px solid var(--border)', fontSize: '10px', color: 'var(--text3)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '.08em' }}>{p.campaign_type || 'Campaign'}</span>
                  </div>
                  <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text)', marginBottom: '4px' }}>{p.name}</div>
                  {p.brands?.name && (
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '3px 9px', borderRadius: '6px', background: 'var(--blue-light)', border: '1px solid rgba(0,87,255,0.15)', fontSize: '11px', color: 'var(--blue)', fontWeight: 600, marginBottom: '12px' }}>
                      🏢 {p.brands.name}
                    </div>
                  )}
                  <div style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--text3)', paddingTop: '12px', borderTop: '1px solid var(--border)' }}>
                    {new Date(p.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </div>
                </a>
                <button onClick={e => deleteProject(p.id, e)} disabled={deletingId === p.id}
                  style={{ position: 'absolute', top: '10px', right: '10px', width: '26px', height: '26px', borderRadius: '7px', background: 'var(--bg3)', border: '1px solid var(--border)', color: 'var(--text3)', fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all .2s' }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,60,60,0.1)'; e.currentTarget.style.borderColor = 'rgba(255,60,60,0.3)'; e.currentTarget.style.color = '#ff3c3c' }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'var(--bg3)'; e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text3)' }}>
                  {deletingId === p.id ? '…' : '🗑'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
