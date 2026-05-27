'use client'
import { useEffect, useState, Suspense } from 'react'
import { supabase } from '@/lib/supabase'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import Sidebar from '@/components/Sidebar'

const TOOLS = {
  image: ['Midjourney v6', 'DALL-E 3', 'Stable Diffusion XL', 'Ideogram', 'Flux'],
  video: ['Runway Gen-3', 'Kling', 'Seedance', 'Sora', 'Pika'],
}

function PromptsContent() {
  const { id } = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [project, setProject] = useState(null)
  const [summary, setSummary] = useState(null)
  const [refs, setRefs] = useState([])
  const [prompts, setPrompts] = useState([])
  const [outputType, setOutputType] = useState('image')
  const [tool, setTool] = useState('Midjourney v6')
  const [ideaContext, setIdeaContext] = useState('')
  const [generatedPrompt, setGeneratedPrompt] = useState('')
  const [generating, setGenerating] = useState(false)
  const [saving, setSaving] = useState(false)
  const [copied, setCopied] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => { fetchAll() }, [id])
  useEffect(() => {
    const idea = searchParams.get('idea')
    const brief = searchParams.get('brief')
    if (idea) setIdeaContext(idea)
    if (brief) setIdeaContext(brief)
  }, [searchParams])

  async function fetchAll() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.push('/login'); return }
    const [{ data: proj }, { data: sum }, { data: refData }, { data: promptData }] = await Promise.all([
      supabase.from('projects').select('*').eq('id', id).single(),
      supabase.from('brand_summaries').select('*').eq('project_id', id).order('created_at', { ascending: false }).limit(1).single(),
      supabase.from('reference_images').select('*').eq('project_id', id),
      supabase.from('generated_prompts').select('*').eq('project_id', id).order('created_at', { ascending: false }),
    ])
    setProject(proj)
    setSummary(sum)
    setRefs(refData || [])
    setPrompts(promptData || [])
    setLoading(false)
  }

  async function generate() {
    if (!summary && refs.length === 0 && !ideaContext) return alert('Add some context first — brand summary, references, or an idea.')
    setGenerating(true)
    try {
      const res = await fetch('/api/prompts/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brandSummary: summary?.summary_text || '',
          refs: refs.map(r => ({ url: r.image_url, tag: r.tag })),
          idea: ideaContext,
          outputType,
          tool,
          projectName: project?.name,
        }),
      })
      const result = await res.json()
      if (result.prompt) setGeneratedPrompt(result.prompt)
    } catch (err) {
      alert('Generation failed: ' + err.message)
    }
    setGenerating(false)
  }

  async function savePrompt() {
    if (!generatedPrompt) return
    setSaving(true)
    await supabase.from('generated_prompts').insert({ project_id: id, output_type: outputType, tool, prompt_text: generatedPrompt })
    setSaving(false)
    fetchAll()
  }

  async function copyPrompt() {
    await navigator.clipboard.writeText(generatedPrompt)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function handleTypeChange(type) {
    setOutputType(type)
    setTool(TOOLS[type][0])
  }

  if (loading) return <LoadingScreen />

  return (
    <div style={{ display: 'flex', height: '100vh', background: 'var(--bg)' }}>
      <Sidebar projectId={id} projectName={project?.name} client={project?.client} />
      <main style={{ flex: 1, overflowY: 'auto' }}>
        <div style={{ position: 'sticky', top: 0, zIndex: 10, padding: '16px 32px', background: 'rgba(248,248,252,0.9)', backdropFilter: 'blur(20px)', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', animation: 'slide-down .5s ease' }}>
          <div>
            <div style={{ fontSize: '18px', fontWeight: 700 }}>Prompt Builder</div>
            <div style={{ fontSize: '11px', color: 'var(--text3)', fontFamily: 'var(--font-mono)', marginTop: '2px' }}>{project?.name} · {prompts.length} prompts generated</div>
          </div>
        </div>

        <div style={{ padding: '28px 32px' }}>
          {/* Builder card */}
          <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '16px', padding: '24px', marginBottom: '20px', boxShadow: 'var(--shadow)', animation: 'reveal .5s ease both', opacity: 0 }}>

            {/* Context tags */}
            <div style={{ fontSize: '10px', fontFamily: 'var(--font-mono)', letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--text3)', marginBottom: '12px' }}>Context loaded</div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '20px' }}>
              {summary && <CtxTag color="blue">✦ Brand Summary</CtxTag>}
              {refs.length > 0 && <CtxTag color="teal">◈ {refs.length} References</CtxTag>}
              {ideaContext && <CtxTag color="purple">⚡ {ideaContext.slice(0, 40)}{ideaContext.length > 40 ? '…' : ''}</CtxTag>}
              {!summary && !refs.length && !ideaContext && <span style={{ fontSize: '12px', color: 'var(--text3)', fontFamily: 'var(--font-mono)' }}>No context loaded — add brand summary, references, or paste an idea below</span>}
            </div>

            {/* Idea input */}
            <div style={{ marginBottom: '18px' }}>
              <div style={{ fontSize: '10px', fontFamily: 'var(--font-mono)', letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--text3)', marginBottom: '8px' }}>Campaign idea / brief (optional)</div>
              <textarea value={ideaContext} onChange={e => setIdeaContext(e.target.value)} placeholder="Paste a brainstorm idea or describe what the visual should be about…"
                style={{ width: '100%', padding: '12px 14px', background: 'var(--bg3)', border: '1.5px solid var(--border)', borderRadius: '10px', color: 'var(--text)', fontFamily: 'var(--font-ui)', fontSize: '13px', lineHeight: 1.6, resize: 'none', minHeight: '70px', outline: 'none', transition: 'border-color .2s' }}
                onFocus={e => e.target.style.borderColor = 'rgba(0,87,255,0.4)'}
                onBlur={e => e.target.style.borderColor = 'var(--border)'} />
            </div>

            {/* Output type */}
            <div style={{ marginBottom: '14px' }}>
              <div style={{ fontSize: '10px', fontFamily: 'var(--font-mono)', letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--text3)', marginBottom: '8px' }}>Output type</div>
              <div style={{ display: 'flex', gap: '8px' }}>
                {['image', 'video'].map(type => (
                  <button key={type} onClick={() => handleTypeChange(type)}
                    style={{ flex: 1, padding: '10px 14px', borderRadius: '10px', border: `1.5px solid ${outputType === type ? 'rgba(0,87,255,0.4)' : 'var(--border)'}`, background: outputType === type ? 'var(--blue-light)' : 'var(--bg3)', color: outputType === type ? 'var(--blue)' : 'var(--text2)', fontFamily: 'var(--font-ui)', fontSize: '13px', fontWeight: 500, cursor: 'pointer', transition: 'all .2s', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                    <span style={{ fontSize: '10px', opacity: .5, fontFamily: 'var(--font-mono)' }}>▼</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Tool */}
            <div style={{ marginBottom: '20px' }}>
              <div style={{ fontSize: '10px', fontFamily: 'var(--font-mono)', letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--text3)', marginBottom: '8px' }}>AI tool</div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {TOOLS[outputType].map(t => (
                  <button key={t} onClick={() => setTool(t)}
                    style={{ padding: '8px 14px', borderRadius: '9px', border: `1.5px solid ${tool === t ? 'rgba(0,87,255,0.4)' : 'var(--border)'}`, background: tool === t ? 'var(--blue-light)' : 'var(--bg3)', color: tool === t ? 'var(--blue)' : 'var(--text2)', fontFamily: 'var(--font-ui)', fontSize: '12px', fontWeight: 500, cursor: 'pointer', transition: 'all .2s' }}>
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* Generated prompt */}
            <div style={{ fontSize: '10px', fontFamily: 'var(--font-mono)', letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--text3)', marginBottom: '8px' }}>Generated prompt</div>
            <div style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: '10px', padding: '16px', fontFamily: 'var(--font-mono)', fontSize: '12px', color: generatedPrompt ? 'var(--text2)' : 'var(--text3)', lineHeight: 1.85, minHeight: '110px', position: 'relative', marginBottom: '16px' }}>
              {generating ? (
                <span style={{ color: 'var(--blue)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ display: 'inline-block', width: '6px', height: '6px', borderRadius: '50%', background: 'var(--blue)', animation: 'dot-beat 1s ease-in-out infinite' }} />
                  Claude is crafting your prompt…
                </span>
              ) : generatedPrompt ? (
                <span>{generatedPrompt}<span style={{ display: 'inline-block', width: '2px', height: '13px', background: 'var(--blue)', marginLeft: '2px', verticalAlign: 'text-bottom', animation: 'blink 1s step-end infinite' }} /></span>
              ) : (
                'Your prompt will appear here…'
              )}
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={generate} disabled={generating}
                style={{ flex: 1, padding: '10px', background: generating ? 'rgba(0,87,255,0.5)' : 'var(--blue)', color: '#fff', border: 'none', borderRadius: '10px', fontFamily: 'var(--font-ui)', fontSize: '13px', fontWeight: 700, letterSpacing: '.05em', textTransform: 'uppercase', cursor: generating ? 'not-allowed' : 'pointer', boxShadow: 'var(--shadow-blue)', transition: 'all .2s' }}>
                {generating ? 'Generating…' : 'Generate Prompt'}
              </button>
              {generatedPrompt && <>
                <button onClick={copyPrompt} style={{ padding: '10px 20px', background: copied ? 'rgba(34,204,136,0.1)' : 'var(--bg3)', border: `1px solid ${copied ? 'rgba(34,204,136,0.3)' : 'var(--border2)'}`, borderRadius: '10px', fontSize: '12px', fontWeight: 700, color: copied ? '#22cc88' : 'var(--text2)', cursor: 'pointer', fontFamily: 'var(--font-ui)', transition: 'all .2s' }}>
                  {copied ? '✓ Copied!' : 'Copy'}
                </button>
                <button onClick={savePrompt} disabled={saving} style={{ padding: '10px 20px', background: 'transparent', border: '1px solid var(--border2)', borderRadius: '10px', fontSize: '12px', fontWeight: 700, color: 'var(--text2)', cursor: 'pointer', fontFamily: 'var(--font-ui)' }}>
                  {saving ? 'Saving…' : 'Save'}
                </button>
                <button onClick={generate} style={{ padding: '10px 16px', background: 'transparent', border: '1px solid var(--border2)', borderRadius: '10px', fontSize: '12px', color: 'var(--text2)', cursor: 'pointer', fontFamily: 'var(--font-ui)' }}>↺</button>
              </>}
            </div>
          </div>

          {/* Saved prompts */}
          {prompts.length > 0 && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', animation: 'reveal .5s .1s ease both', opacity: 0 }}>
                <span style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '.1em', color: 'var(--text3)', textTransform: 'uppercase' }}>Saved Prompts</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', animation: 'reveal .5s .2s ease both', opacity: 0 }}>
                {prompts.map(p => <SavedPrompt key={p.id} prompt={p} />)}
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  )
}

function CtxTag({ color, children }) {
  const colors = { blue: { bg: 'var(--blue-light)', border: 'rgba(0,87,255,0.25)', text: 'var(--blue)' }, teal: { bg: 'rgba(0,200,180,0.06)', border: 'rgba(0,200,180,0.25)', text: '#00c8b4' }, purple: { bg: 'rgba(160,80,255,0.06)', border: 'rgba(160,80,255,0.25)', text: '#a050ff' } }
  const c = colors[color]
  return <span style={{ padding: '5px 12px', borderRadius: '20px', fontSize: '11px', fontFamily: 'var(--font-mono)', border: `1px solid ${c.border}`, background: c.bg, color: c.text, cursor: 'default', transition: 'transform .2s' }}>{children}</span>
}

function SavedPrompt({ prompt }) {
  const [hover, setHover] = useState(false)
  const [copied, setCopied] = useState(false)
  const toolColors = { image: 'var(--blue)', video: '#00c8b4' }
  return (
    <div onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{ background: 'var(--bg2)', border: `1px solid ${hover ? 'rgba(0,87,255,0.2)' : 'var(--border)'}`, borderRadius: '12px', padding: '16px 18px', transition: 'all .25s', transform: hover ? 'translateX(3px)' : 'none', boxShadow: hover ? 'var(--shadow-hover)' : 'var(--shadow)', cursor: 'default' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
        <span style={{ fontSize: '10px', letterSpacing: '.12em', textTransform: 'uppercase', fontFamily: 'var(--font-mono)', color: toolColors[prompt.output_type] || 'var(--blue)', fontWeight: 500 }}>{prompt.tool} · {prompt.output_type}</span>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <span style={{ fontSize: '10px', fontFamily: 'var(--font-mono)', color: 'var(--text3)' }}>{new Date(prompt.created_at).toLocaleDateString()}</span>
          <button onClick={async () => { await navigator.clipboard.writeText(prompt.prompt_text); setCopied(true); setTimeout(() => setCopied(false), 2000) }}
            style={{ padding: '4px 10px', background: copied ? 'rgba(34,204,136,0.1)' : 'var(--bg3)', border: `1px solid ${copied ? 'rgba(34,204,136,0.3)' : 'var(--border)'}`, borderRadius: '6px', fontSize: '10px', color: copied ? '#22cc88' : 'var(--text3)', cursor: 'pointer', fontFamily: 'var(--font-ui)' }}>
            {copied ? '✓' : 'Copy'}
          </button>
        </div>
      </div>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text2)', lineHeight: 1.7 }}>{prompt.prompt_text}</div>
    </div>
  )
}

function LoadingScreen() {
  return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', fontFamily: 'var(--font-mono)', fontSize: '13px', color: 'var(--text3)' }}>Loading…</div>
}

export default function PromptsPage() {
  return <Suspense fallback={<LoadingScreen />}><PromptsContent /></Suspense>
}
