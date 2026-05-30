'use client'
import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useParams, useRouter } from 'next/navigation'
import Sidebar from '@/components/Sidebar'

const VIDEO_TOOLS = ['Kling', 'Seedance', 'Runway', 'Google VEO', 'Grok', 'Minimax', 'Sora', 'Wan']

export default function VideoScriptPage() {
  const { id } = useParams()
  const router = useRouter()
  const [project, setProject] = useState(null)
  const [summary, setSummary] = useState(null)
  const [refs, setRefs] = useState([])
  const [loading, setLoading] = useState(true)
  const [script, setScript] = useState('')
  const [tool, setTool] = useState('Kling')
  const [scenes, setScenes] = useState([])
  const [generating, setGenerating] = useState(false)
  const [copiedId, setCopiedId] = useState(null)
  const [copiedAll, setCopiedAll] = useState(false)
  const [expandedId, setExpandedId] = useState(null)

  useEffect(() => { fetchAll() }, [id])

  async function fetchAll() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.push('/login'); return }
    const [{ data: proj }, { data: sum }, { data: refData }] = await Promise.all([
      supabase.from('projects').select('*, brands(*)').eq('id', id).single(),
      supabase.from('brand_summaries').select('*').eq('project_id', id).order('created_at', { ascending: false }).limit(1).single(),
      supabase.from('reference_images').select('*').eq('project_id', id),
    ])
    setProject(proj)
    setSummary(sum)
    setRefs(refData || [])
    setLoading(false)
  }

  async function generateScenes() {
    if (!script.trim()) return
    setGenerating(true)
    setScenes([])
    try {
      const res = await fetch('/api/videoscript/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          script,
          tool,
          brandSummary: summary?.summary_text || project?.brands?.summary_text || '',
          refs: refs.map(r => ({ url: r.image_url, tag: r.tag })),
          projectName: project?.name,
        }),
      })
      const result = await res.json()
      if (result.scenes) setScenes(result.scenes)
    } catch (err) { alert('Generation failed: ' + err.message) }
    setGenerating(false)
  }

  async function regenerateScene(sceneIndex) {
    const scene = scenes[sceneIndex]
    setScenes(prev => prev.map((s, i) => i === sceneIndex ? { ...s, regenerating: true } : s))
    try {
      const res = await fetch('/api/videoscript/regenerate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scene: scene.description,
          sceneNum: scene.scene,
          tool,
          brandSummary: summary?.summary_text || project?.brands?.summary_text || '',
          refs: refs.map(r => ({ url: r.image_url, tag: r.tag })),
        }),
      })
      const result = await res.json()
      if (result.prompt) {
        setScenes(prev => prev.map((s, i) => i === sceneIndex ? { ...s, prompt: result.prompt, regenerating: false } : s))
      }
    } catch (err) {
      setScenes(prev => prev.map((s, i) => i === sceneIndex ? { ...s, regenerating: false } : s))
    }
  }

  async function copyScene(scene, sceneId) {
    await navigator.clipboard.writeText(scene.prompt)
    setCopiedId(sceneId)
    setTimeout(() => setCopiedId(null), 2000)
  }

  async function copyAll() {
    const allPrompts = scenes.map((s, i) =>
      `SCENE ${s.scene} — ${s.title}\nDuration: ${s.duration}\n\n${s.prompt}`
    ).join('\n\n─────────────────\n\n')
    await navigator.clipboard.writeText(allPrompts)
    setCopiedAll(true)
    setTimeout(() => setCopiedAll(false), 2500)
  }

  if (loading) return <LoadingScreen />

  const brandSummary = summary?.summary_text || project?.brands?.summary_text || ''

  return (
    <div style={{ display: 'flex', height: '100vh', background: 'var(--bg)' }}>
      <Sidebar projectId={id} projectName={project?.name} brandName={project?.brands?.name} campaignType={project?.campaign_type} />
      <main style={{ flex: 1, overflowY: 'auto' }}>

        {/* Topbar */}
        <div style={{ position: 'sticky', top: 0, zIndex: 10, padding: '16px 32px', background: 'rgba(248,248,252,0.9)', backdropFilter: 'blur(20px)', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', animation: 'slide-down .5s ease' }}>
          <div>
            <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text)' }}>Video Script</div>
            <div style={{ fontSize: '11px', color: 'var(--text3)', fontFamily: 'var(--font-mono)', marginTop: '2px' }}>{project?.name} · Paste script → get per-scene prompts</div>
          </div>
          {scenes.length > 0 && (
            <button onClick={copyAll}
              style={{ padding: '9px 18px', background: copiedAll ? 'rgba(34,204,136,0.1)' : 'var(--blue)', color: copiedAll ? '#22cc88' : '#fff', border: copiedAll ? '1px solid rgba(34,204,136,0.3)' : 'none', borderRadius: '9px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-ui)', letterSpacing: '.04em', textTransform: 'uppercase', boxShadow: copiedAll ? 'none' : 'var(--shadow-blue)', transition: 'all .2s' }}>
              {copiedAll ? '✓ All Copied!' : `Copy All ${scenes.length} Scenes`}
            </button>
          )}
        </div>

        <div style={{ padding: '28px 32px' }}>

          {/* Input panel */}
          <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '16px', padding: '24px', marginBottom: '24px', boxShadow: 'var(--shadow)', animation: 'reveal .5s ease both', opacity: 0 }}>

            {/* Context row */}
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '18px', padding: '10px 14px', background: 'var(--bg3)', borderRadius: '10px', border: '1px solid var(--border)' }}>
              <span style={{ fontSize: '11px', color: 'var(--text3)', fontFamily: 'var(--font-mono)', marginRight: '4px' }}>Context:</span>
              {brandSummary
                ? <CtxTag color="blue">✦ Brand Summary Active</CtxTag>
                : <span style={{ fontSize: '11px', color: 'var(--text3)', fontFamily: 'var(--font-mono)' }}>No brand summary — prompts will be generic</span>}
              {refs.length > 0 && <CtxTag color="teal">◈ {refs.length} References</CtxTag>}
            </div>

            {/* Tool selector */}
            <div style={{ marginBottom: '16px' }}>
              <Label>Video Tool</Label>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {VIDEO_TOOLS.map(t => (
                  <button key={t} onClick={() => setTool(t)}
                    style={{ padding: '7px 14px', borderRadius: '9px', border: `1.5px solid ${tool === t ? 'rgba(0,87,255,0.4)' : 'var(--border)'}`, background: tool === t ? 'var(--blue-light)' : 'var(--bg3)', color: tool === t ? 'var(--blue)' : 'var(--text2)', fontFamily: 'var(--font-ui)', fontSize: '12px', fontWeight: 600, cursor: 'pointer', transition: 'all .2s' }}>
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* Script input */}
            <div style={{ marginBottom: '16px' }}>
              <Label>Paste Video Script</Label>
              <textarea
                value={script}
                onChange={e => setScript(e.target.value)}
                placeholder={`Paste your full video script here…\n\nE.g:\nScene 1: Pre-dawn. A woman sits on her front steps lacing her Nike shoes. City is silent.\nScene 2: She stands, takes her first step. Motion blur. Camera follows.\nScene 3: Running through empty streets. 5am light.\nScene 4: Product close-up. Shoe hits puddle. Slow motion.\nScene 5: She stops, catches breath. Smiles. Tagline appears.\n\nCan be formatted any way — numbered scenes, timestamps, paragraphs, shooting script.`}
                style={{ width: '100%', minHeight: '200px', padding: '14px', background: 'var(--bg3)', border: '1.5px solid var(--border)', borderRadius: '12px', color: 'var(--text)', fontFamily: 'var(--font-ui)', fontSize: '13px', lineHeight: 1.75, resize: 'vertical', outline: 'none', transition: 'border-color .2s' }}
                onFocus={e => e.target.style.borderColor = 'rgba(0,87,255,0.4)'}
                onBlur={e => e.target.style.borderColor = 'var(--border)'}
              />
            </div>

            <button onClick={generateScenes} disabled={generating || !script.trim()}
              style={{ width: '100%', padding: '12px', background: generating ? 'rgba(0,87,255,0.5)' : 'var(--blue)', color: '#fff', border: 'none', borderRadius: '10px', fontFamily: 'var(--font-ui)', fontSize: '13px', fontWeight: 700, letterSpacing: '.05em', textTransform: 'uppercase', cursor: generating ? 'not-allowed' : 'pointer', boxShadow: 'var(--shadow-blue)', transition: 'all .2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
              {generating
                ? <><Spinner />Breaking script into scenes and generating prompts…</>
                : `🎬 Generate ${tool} Prompts for All Scenes`}
            </button>
          </div>

          {/* Generating state */}
          {generating && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px 20px', background: 'var(--blue-light)', border: '1px solid rgba(0,87,255,0.2)', borderRadius: '12px', marginBottom: '20px', animation: 'reveal .3s ease both' }}>
              <Spinner />
              <div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--blue)' }}>Claude is reading your script…</div>
                <div style={{ fontSize: '11px', color: 'var(--text3)', marginTop: '2px', fontFamily: 'var(--font-mono)' }}>Breaking into scenes → analysing each frame → generating {tool} prompts with brand context</div>
              </div>
            </div>
          )}

          {/* Scene cards */}
          {scenes.length > 0 && (
            <div style={{ animation: 'reveal .5s ease both', opacity: 0 }}>
              {/* Summary bar */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '.1em', color: 'var(--text3)', textTransform: 'uppercase' }}>{scenes.length} Scenes Generated</span>
                  <span style={{ padding: '3px 9px', borderRadius: '6px', background: 'var(--blue-light)', border: '1px solid rgba(0,87,255,0.15)', fontSize: '11px', color: 'var(--blue)', fontFamily: 'var(--font-mono)' }}>{tool}</span>
                  {brandSummary && <span style={{ padding: '3px 9px', borderRadius: '6px', background: 'rgba(0,200,180,0.08)', border: '1px solid rgba(0,200,180,0.2)', fontSize: '11px', color: '#00c8b4', fontFamily: 'var(--font-mono)' }}>Brand Active</span>}
                </div>
                <button onClick={() => { setScenes([]); setScript('') }}
                  style={{ padding: '6px 12px', background: 'transparent', border: '1px solid var(--border2)', borderRadius: '8px', fontSize: '11px', color: 'var(--text3)', cursor: 'pointer', fontFamily: 'var(--font-ui)' }}>
                  Start Over
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {scenes.map((scene, i) => (
                  <SceneCard
                    key={i}
                    scene={scene}
                    index={i}
                    tool={tool}
                    copiedId={copiedId}
                    expanded={expandedId === i}
                    onToggle={() => setExpandedId(expandedId === i ? null : i)}
                    onCopy={() => copyScene(scene, i)}
                    onRegenerate={() => regenerateScene(i)}
                  />
                ))}
              </div>

              {/* Shot list export */}
              <div style={{ marginTop: '20px', padding: '18px 20px', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '14px', boxShadow: 'var(--shadow)' }}>
                <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text)', marginBottom: '4px' }}>📋 Full Shot List</div>
                <div style={{ fontSize: '12px', color: 'var(--text3)', marginBottom: '14px' }}>All {scenes.length} scene prompts formatted and ready to share with your editor or video team</div>
                <div style={{ background: 'var(--bg3)', borderRadius: '10px', padding: '14px', fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text2)', lineHeight: 1.8, maxHeight: '220px', overflowY: 'auto', border: '1px solid var(--border)' }}>
                  {scenes.map((s, i) => (
                    <div key={i} style={{ marginBottom: i < scenes.length - 1 ? '16px' : 0 }}>
                      <div style={{ color: 'var(--blue)', fontWeight: 500, marginBottom: '4px' }}>SCENE {s.scene} — {s.title} · {s.duration}</div>
                      <div style={{ color: 'var(--text3)', marginBottom: '4px' }}>{s.description}</div>
                      <div style={{ color: 'var(--text2)' }}>{s.prompt}</div>
                      {i < scenes.length - 1 && <div style={{ borderTop: '1px solid var(--border)', marginTop: '12px' }} />}
                    </div>
                  ))}
                </div>
                <button onClick={copyAll} style={{ marginTop: '12px', width: '100%', padding: '10px', background: copiedAll ? 'rgba(34,204,136,0.1)' : 'var(--blue)', color: copiedAll ? '#22cc88' : '#fff', border: copiedAll ? '1px solid rgba(34,204,136,0.3)' : 'none', borderRadius: '9px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-ui)', letterSpacing: '.04em', textTransform: 'uppercase', boxShadow: copiedAll ? 'none' : 'var(--shadow-blue)', transition: 'all .2s' }}>
                  {copiedAll ? '✓ Copied!' : 'Copy Full Shot List'}
                </button>
              </div>
            </div>
          )}

          {/* Empty state */}
          {!generating && scenes.length === 0 && (
            <div style={{ textAlign: 'center', padding: '60px 40px', background: 'var(--bg2)', border: '1.5px dashed rgba(0,87,255,0.15)', borderRadius: '16px', animation: 'reveal .5s .1s ease both', opacity: 0 }}>
              <div style={{ fontSize: '40px', marginBottom: '14px' }}>🎬</div>
              <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text)', marginBottom: '8px' }}>Paste your video script above</div>
              <div style={{ fontSize: '13px', color: 'var(--text3)', maxWidth: '420px', margin: '0 auto', lineHeight: 1.7 }}>
                Claude reads the full script, breaks it into scenes, and generates a tool-specific prompt for each frame — with brand context and visual references baked in automatically.
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

function SceneCard({ scene, index, tool, copiedId, expanded, onToggle, onCopy, onRegenerate }) {
  const [hover, setHover] = useState(false)
  const colors = ['#0057ff', '#00c8b4', '#a050ff', '#ff643c', '#e8a020', '#22cc88', '#ff3c7a', '#5090ff']
  const color = colors[index % colors.length]

  return (
    <div onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{ background: 'var(--bg2)', border: `1px solid ${hover ? 'rgba(0,87,255,0.2)' : 'var(--border)'}`, borderRadius: '14px', overflow: 'hidden', transition: 'all .25s', boxShadow: hover ? 'var(--shadow-hover)' : 'var(--shadow)' }}>

      {/* Scene header */}
      <div onClick={onToggle} style={{ padding: '16px 20px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '14px' }}>
        {/* Scene number */}
        <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: `${color}18`, border: `1px solid ${color}33`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <span style={{ fontSize: '12px', fontWeight: 800, color, fontFamily: 'var(--font-mono)' }}>{String(scene.scene).padStart(2, '0')}</span>
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text)', marginBottom: '2px' }}>{scene.title}</div>
          <div style={{ fontSize: '11px', color: 'var(--text3)', fontFamily: 'var(--font-mono)', display: 'flex', gap: '12px' }}>
            <span>⏱ {scene.duration}</span>
            <span>📷 {scene.camera}</span>
          </div>
        </div>

        {/* Tags */}
        <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
          <span style={{ padding: '3px 9px', borderRadius: '6px', background: `${color}12`, border: `1px solid ${color}30`, fontSize: '10px', color, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '.06em' }}>{tool}</span>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }} onClick={e => e.stopPropagation()}>
          <button onClick={onRegenerate} disabled={scene.regenerating}
            style={{ padding: '6px 10px', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: '7px', fontSize: '13px', color: 'var(--text3)', cursor: 'pointer', transition: 'all .2s' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(0,87,255,0.3)'; e.currentTarget.style.color = 'var(--blue)' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text3)' }}>
            {scene.regenerating ? '…' : '↺'}
          </button>
          <button onClick={onCopy}
            style={{ padding: '6px 14px', background: copiedId === index ? 'rgba(34,204,136,0.1)' : 'var(--blue-light)', border: `1px solid ${copiedId === index ? 'rgba(34,204,136,0.3)' : 'rgba(0,87,255,0.2)'}`, borderRadius: '7px', fontSize: '11px', fontWeight: 700, color: copiedId === index ? '#22cc88' : 'var(--blue)', cursor: 'pointer', fontFamily: 'var(--font-ui)', transition: 'all .2s' }}>
            {copiedId === index ? '✓ Copied' : 'Copy'}
          </button>
        </div>

        <span style={{ color: 'var(--text3)', fontSize: '12px', flexShrink: 0 }}>{expanded ? '▲' : '▼'}</span>
      </div>

      {/* Expanded content */}
      {expanded && (
        <div style={{ borderTop: '1px solid var(--border)', padding: '16px 20px', animation: 'reveal .3s ease both', opacity: 0 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
            <div>
              <div style={{ fontSize: '10px', fontFamily: 'var(--font-mono)', letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--text3)', marginBottom: '6px' }}>Scene Description</div>
              <div style={{ fontSize: '12px', color: 'var(--text2)', lineHeight: 1.65 }}>{scene.description}</div>
            </div>
            <div>
              <div style={{ fontSize: '10px', fontFamily: 'var(--font-mono)', letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--text3)', marginBottom: '6px' }}>Visual Direction</div>
              <div style={{ fontSize: '12px', color: 'var(--text2)', lineHeight: 1.65 }}>{scene.visual}</div>
            </div>
          </div>
          <div>
            <div style={{ fontSize: '10px', fontFamily: 'var(--font-mono)', letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--text3)', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              {tool} Prompt
              <span style={{ padding: '2px 7px', borderRadius: '5px', background: `${colors[index % colors.length]}15`, color: colors[index % colors.length], fontSize: '10px', textTransform: 'none', letterSpacing: 0 }}>Ready to paste</span>
            </div>
            <div style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: '10px', padding: '14px', fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text2)', lineHeight: 1.8 }}>
              {scene.regenerating
                ? <span style={{ color: 'var(--blue)', display: 'flex', alignItems: 'center', gap: '8px' }}><Spinner small />Regenerating prompt…</span>
                : scene.prompt}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Label({ children }) {
  return <div style={{ fontSize: '10px', fontFamily: 'var(--font-mono)', letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--text3)', marginBottom: '8px', fontWeight: 500 }}>{children}</div>
}

function CtxTag({ color, children }) {
  const colors = {
    blue: { bg: 'var(--blue-light)', border: 'rgba(0,87,255,0.25)', text: 'var(--blue)' },
    teal: { bg: 'rgba(0,200,180,0.06)', border: 'rgba(0,200,180,0.25)', text: '#00c8b4' },
  }
  const c = colors[color]
  return <span style={{ padding: '5px 12px', borderRadius: '20px', fontSize: '11px', fontFamily: 'var(--font-mono)', border: `1px solid ${c.border}`, background: c.bg, color: c.text }}>{children}</span>
}

function Spinner({ small }) {
  return <div style={{ width: small ? '10px' : '14px', height: small ? '10px' : '14px', border: '2px solid rgba(0,87,255,0.2)', borderTopColor: 'var(--blue)', borderRadius: '50%', animation: 'spin .7s linear infinite', flexShrink: 0 }} />
}

function LoadingScreen() {
  return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', fontFamily: 'var(--font-mono)', fontSize: '13px', color: 'var(--text3)' }}>Loading…</div>
}
