'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useParams, useRouter } from 'next/navigation'
import Sidebar from '@/components/Sidebar'

export default function BrainstormPage() {
  const { id } = useParams()
  const router = useRouter()
  const [project, setProject] = useState(null)
  const [summary, setSummary] = useState(null)
  const [sessions, setSessions] = useState([])
  const [activeSession, setActiveSession] = useState(null)
  const [ideas, setIdeas] = useState([])
  const [brief, setBrief] = useState('')
  const [generating, setGenerating] = useState(false)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('All')

  useEffect(() => { fetchAll() }, [id])

  async function fetchAll() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.push('/login'); return }
    const [{ data: proj }, { data: sum }, { data: sess }] = await Promise.all([
      supabase.from('projects').select('*').eq('id', id).single(),
      supabase.from('brand_summaries').select('*').eq('project_id', id).order('created_at', { ascending: false }).limit(1).single(),
      supabase.from('brainstorm_sessions').select('*').eq('project_id', id).order('created_at', { ascending: false }),
    ])
    setProject(proj)
    setSummary(sum)
    setSessions(sess || [])
    if (sess?.length > 0) loadSession(sess[0].id)
    setLoading(false)
  }

  async function loadSession(sessionId) {
    setActiveSession(sessionId)
    const { data } = await supabase.from('brainstorm_ideas').select('*').eq('session_id', sessionId).order('created_at')
    setIdeas(data || [])
  }

  async function generate() {
    if (!brief.trim()) return
    if (!summary) return alert('Upload brand guidelines first to activate brand context.')
    setGenerating(true)
    try {
      const { data: sess } = await supabase.from('brainstorm_sessions').insert({ project_id: id, brief }).select().single()
      const res = await fetch('/api/brainstorm/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brief, brandSummary: summary.summary_text, projectName: project?.name }),
      })
      const result = await res.json()
      if (result.ideas) {
        const toInsert = result.ideas.map(idea => ({ session_id: sess.id, label: idea.label, title: idea.title, body: idea.body }))
        await supabase.from('brainstorm_ideas').insert(toInsert)
        await fetchAll()
        loadSession(sess.id)
        setBrief('')
      }
    } catch (err) {
      alert('Generation failed: ' + err.message)
    }
    setGenerating(false)
  }

  const filters = ['All', 'Territory', 'Tagline', 'Concept']
  const filtered = ideas.filter(i => filter === 'All' || i.label?.toLowerCase().includes(filter.toLowerCase()))

  if (loading) return <LoadingScreen />

  return (
    <div style={{ display: 'flex', height: '100vh', background: 'var(--bg)' }}>
      <Sidebar projectId={id} projectName={project?.name} client={project?.client} />
      <main style={{ flex: 1, overflowY: 'auto' }}>
        <div style={{ position: 'sticky', top: 0, zIndex: 10, padding: '16px 32px', background: 'rgba(248,248,252,0.9)', backdropFilter: 'blur(20px)', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', animation: 'slide-down .5s ease' }}>
          <div>
            <div style={{ fontSize: '18px', fontWeight: 700 }}>Brainstorm Room</div>
            <div style={{ fontSize: '11px', color: 'var(--text3)', fontFamily: 'var(--font-mono)', marginTop: '2px' }}>{project?.name} · {sessions.length} sessions</div>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            {sessions.length > 1 && (
              <select onChange={e => loadSession(e.target.value)} value={activeSession || ''}
                style={{ padding: '8px 12px', background: 'var(--bg2)', border: '1px solid var(--border2)', borderRadius: '8px', fontSize: '12px', color: 'var(--text2)', fontFamily: 'var(--font-ui)', cursor: 'pointer' }}>
                {sessions.map(s => <option key={s.id} value={s.id}>{new Date(s.created_at).toLocaleDateString()} — {s.brief?.slice(0, 30)}…</option>)}
              </select>
            )}
          </div>
        </div>

        <div style={{ padding: '28px 32px' }}>
          {/* Brief input */}
          <div style={{ background: 'var(--bg2)', border: `1.5px solid ${generating ? 'rgba(0,87,255,0.4)' : 'var(--border2)'}`, borderRadius: '14px', padding: '20px', marginBottom: '20px', transition: 'border-color .3s', boxShadow: generating ? '0 0 0 3px rgba(0,87,255,0.08)' : 'var(--shadow)', animation: 'reveal .5s ease both', opacity: 0 }}>
            <textarea value={brief} onChange={e => setBrief(e.target.value)} placeholder="Describe your campaign objective or brief…&#10;e.g. 'Summer launch for new running shoe. Target: women 25–35. Tone: empowering but not aggressive.'"
              style={{ width: '100%', background: 'transparent', border: 'none', outline: 'none', color: 'var(--text)', fontFamily: 'var(--font-ui)', fontSize: '14px', lineHeight: 1.75, resize: 'none', minHeight: '90px' }} />
            <div style={{ display: 'flex', gap: '10px', marginTop: '14px', paddingTop: '14px', borderTop: '1px solid var(--border)', alignItems: 'center' }}>
              <button onClick={generate} disabled={generating || !brief.trim()}
                style={{ padding: '9px 22px', background: generating ? 'rgba(0,87,255,0.5)' : 'var(--blue)', color: '#fff', border: 'none', borderRadius: '9px', fontFamily: 'var(--font-ui)', fontSize: '12px', fontWeight: 700, letterSpacing: '.05em', textTransform: 'uppercase', cursor: generating ? 'not-allowed' : 'pointer', transition: 'all .2s', boxShadow: 'var(--shadow-blue)' }}>
                {generating ? '⚡ Generating…' : '⚡ Generate Ideas'}
              </button>
              <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '7px', padding: '6px 12px', borderRadius: '8px', background: summary ? 'var(--blue-light)' : 'var(--bg3)', border: `1px solid ${summary ? 'rgba(0,87,255,0.15)' : 'var(--border)'}`, fontSize: '11px', color: summary ? 'var(--blue)' : 'var(--text3)', fontFamily: 'var(--font-mono)' }}>
                <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: summary ? 'var(--blue)' : 'var(--text3)', animation: summary ? 'dot-beat 2s ease-in-out infinite' : 'none' }} />
                {summary ? 'Brand context active' : 'No brand context — upload guidelines'}
              </div>
            </div>
          </div>

          {/* Filter tabs */}
          {ideas.length > 0 && (
            <div style={{ display: 'flex', gap: '4px', marginBottom: '18px', background: 'var(--bg3)', borderRadius: '10px', padding: '4px', border: '1px solid var(--border)', animation: 'reveal .5s .1s ease both', opacity: 0 }}>
              {filters.map(f => (
                <button key={f} onClick={() => setFilter(f)}
                  style={{ flex: 1, padding: '7px 10px', borderRadius: '7px', textAlign: 'center', fontSize: '11px', fontWeight: 700, cursor: 'pointer', transition: 'all .2s', color: filter === f ? 'var(--blue)' : 'var(--text3)', background: filter === f ? 'var(--bg2)' : 'transparent', border: 'none', fontFamily: 'var(--font-ui)', textTransform: 'uppercase', letterSpacing: '.06em', boxShadow: filter === f ? 'var(--shadow)' : 'none' }}>
                  {f}
                </button>
              ))}
            </div>
          )}

          {/* Ideas */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {filtered.map((idea, i) => (
              <IdeaCard key={idea.id} idea={idea} index={i} projectId={id} />
            ))}
            {ideas.length === 0 && !generating && (
              <div style={{ textAlign: 'center', padding: '60px 40px', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '16px' }}>
                <div style={{ fontSize: '32px', marginBottom: '12px' }}>⚡</div>
                <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text)', marginBottom: '6px' }}>No ideas yet</div>
                <div style={{ fontSize: '13px', color: 'var(--text3)' }}>Write a brief above and hit Generate Ideas</div>
              </div>
            )}
            {generating && <GeneratingCard />}
          </div>
        </div>
      </main>
    </div>
  )
}

function IdeaCard({ idea, index, projectId }) {
  const [hover, setHover] = useState(false)
  return (
    <div onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{ background: 'var(--bg2)', border: `1px solid ${hover ? 'rgba(0,87,255,0.2)' : 'var(--border)'}`, borderRadius: '12px', padding: '18px 20px', transition: 'all .25s', transform: hover ? 'translateX(3px)' : 'none', boxShadow: hover ? 'var(--shadow-hover)' : 'var(--shadow)', animation: `reveal .5s ${index * 0.07}s ease both`, opacity: 0, position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: hover ? '4px' : '3px', background: 'var(--blue)', opacity: hover ? 1 : .25, transition: 'all .25s', borderRadius: '3px 0 0 3px' }} />
      <div style={{ fontSize: '10px', color: 'var(--blue)', letterSpacing: '.15em', textTransform: 'uppercase', fontFamily: 'var(--font-mono)', marginBottom: '6px' }}>{idea.label}</div>
      <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text)', marginBottom: '6px' }}>{idea.title}</div>
      <div style={{ fontSize: '13px', color: 'var(--text2)', lineHeight: 1.65 }}>{idea.body}</div>
      <div style={{ display: 'flex', gap: '8px', marginTop: '14px' }}>
        <a href={`/project/${projectId}/prompts?idea=${encodeURIComponent(idea.title)}`}
          style={{ padding: '6px 14px', borderRadius: '7px', fontSize: '11px', fontWeight: 600, cursor: 'pointer', background: 'var(--blue-light)', border: '1px solid rgba(0,87,255,0.2)', color: 'var(--blue)', fontFamily: 'var(--font-ui)', textDecoration: 'none' }}>
          → Send to Prompt Builder
        </a>
        <button onClick={() => navigator.clipboard.writeText(`${idea.title}\n\n${idea.body}`)}
          style={{ padding: '6px 14px', borderRadius: '7px', fontSize: '11px', fontWeight: 600, cursor: 'pointer', background: 'var(--bg3)', border: '1px solid var(--border)', color: 'var(--text2)', fontFamily: 'var(--font-ui)' }}>
          Copy
        </button>
      </div>
    </div>
  )
}

function GeneratingCard() {
  return (
    <div style={{ background: 'var(--blue-light)', border: '1px solid rgba(0,87,255,0.2)', borderRadius: '12px', padding: '24px 20px', display: 'flex', alignItems: 'center', gap: '14px' }}>
      <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--blue)', animation: 'dot-beat 1s ease-in-out infinite' }} />
      <span style={{ fontSize: '13px', color: 'var(--blue)', fontFamily: 'var(--font-mono)' }}>Claude is generating ideas with your brand context…</span>
    </div>
  )
}

function LoadingScreen() {
  return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', fontFamily: 'var(--font-mono)', fontSize: '13px', color: 'var(--text3)' }}>Loading…</div>
}
