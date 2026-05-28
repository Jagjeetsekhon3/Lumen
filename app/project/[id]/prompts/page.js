'use client'
import { useEffect, useState, useRef, Suspense } from 'react'
import { supabase } from '@/lib/supabase'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import Sidebar from '@/components/Sidebar'

const TOOLS = {
  image: ['ChatGPT', 'Midjourney', 'Nano Banana', 'Flux', 'Adobe Firefly', 'Recraft', 'Higgsfield', 'Soul', 'Seeddream'],
  video: ['Google VEO', 'Seedance', 'Kling', 'Grok', 'Runway', 'Minimax', 'Sora', 'Wan'],
}

const MODES = [
  { id: 'standard', label: '✦ Prompt Builder', desc: 'Generate image or video prompts with brand + reference context' },
  { id: 'design', label: '⬡ Full Design Generation', desc: 'Complete design brief for ChatGPT — typography, product, background, copy' },
]

const DESIGN_FIELDS = [
  { key: 'typography', label: 'Typography Reference', tag: 'typography', placeholder: 'Describe font style — e.g. Bold sans-serif, tight tracking, white on dark' },
  { key: 'background', label: 'Background Reference', tag: 'background', placeholder: 'Describe background — e.g. Dark textured studio, warm earthy tones' },
  { key: 'product', label: 'Product Treatment Reference', tag: 'product', placeholder: 'Describe product — e.g. Hero shot, centered, dramatic lighting' },
  { key: 'color', label: 'Color Palette Reference', tag: 'color', placeholder: 'Describe colors — e.g. Black + copper + cream, high contrast' },
]

function RefPicker({ tag, refs, value, onChange, placeholder }) {
  const [mode, setMode] = useState('text') // 'text' | 'ref' | 'upload'
  const [uploading, setUploading] = useState(false)
  const uploadRef = useRef()
  const taggedRefs = refs.filter(r => r.tag === tag)

  async function handleUpload(e) {
    const file = e.target.files[0]
    if (!file) return
    setUploading(true)
    const { data: { user } } = await supabase.auth.getUser()
    const path = `${user.id}/design-refs/${Date.now()}-${file.name}`
    const { error } = await supabase.storage.from('reference-images').upload(path, file)
    if (!error) {
      const { data: { publicUrl } } = supabase.storage.from('reference-images').getPublicUrl(path)
      onChange({ type: 'image', url: publicUrl, text: '' })
    }
    setUploading(false)
  }

  return (
    <div>
      {/* Mode toggle */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '8px', background: 'var(--bg3)', borderRadius: '8px', padding: '3px', border: '1px solid var(--border)' }}>
        {[
          { id: 'text', label: '✏️ Text' },
          { id: 'ref', label: `🎨 From Board${taggedRefs.length > 0 ? ` (${taggedRefs.length})` : ''}` },
          { id: 'upload', label: '↑ Upload' },
        ].map(m => (
          <button key={m.id} onClick={() => { setMode(m.id); if (m.id === 'text') onChange({ type: 'text', url: '', text: value?.text || '' }) }}
            style={{ flex: 1, padding: '5px 8px', borderRadius: '6px', fontSize: '10px', fontWeight: 700, cursor: 'pointer', transition: 'all .2s', color: mode === m.id ? 'var(--blue)' : 'var(--text3)', background: mode === m.id ? 'var(--bg2)' : 'transparent', border: 'none', fontFamily: 'var(--font-ui)', letterSpacing: '.04em', textTransform: 'uppercase', boxShadow: mode === m.id ? 'var(--shadow)' : 'none', whiteSpace: 'nowrap' }}>
            {m.label}
          </button>
        ))}
      </div>

      {/* Text mode */}
      {mode === 'text' && (
        <input
          value={value?.text || ''}
          onChange={e => onChange({ type: 'text', url: '', text: e.target.value })}
          placeholder={placeholder}
          style={{ width: '100%', padding: '9px 12px', background: 'var(--bg3)', border: '1.5px solid var(--border)', borderRadius: '9px', color: 'var(--text)', fontFamily: 'var(--font-ui)', fontSize: '12px', outline: 'none', transition: 'border-color .2s' }}
          onFocus={e => e.target.style.borderColor = 'rgba(0,87,255,0.4)'}
          onBlur={e => e.target.style.borderColor = 'var(--border)'}
        />
      )}

      {/* From Reference Board */}
      {mode === 'ref' && (
        <div>
          {taggedRefs.length === 0 ? (
            <div style={{ padding: '12px', background: 'var(--bg3)', borderRadius: '9px', border: '1px dashed var(--border2)', textAlign: 'center', fontSize: '12px', color: 'var(--text3)' }}>
              No {tag} references on board yet —
              <button onClick={() => setMode('upload')} style={{ background: 'none', border: 'none', color: 'var(--blue)', cursor: 'pointer', fontSize: '12px', fontWeight: 600, padding: '0 4px' }}>upload one</button>
              or add from Reference Board first
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '6px' }}>
              {taggedRefs.map(ref => (
                <div key={ref.id} onClick={() => onChange({ type: 'image', url: ref.image_url, text: '' })}
                  style={{ borderRadius: '8px', overflow: 'hidden', border: `2px solid ${value?.url === ref.image_url ? 'var(--blue)' : 'var(--border)'}`, cursor: 'pointer', transition: 'all .2s', position: 'relative', aspectRatio: '1', background: 'var(--bg3)' }}>
                  <img src={ref.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => e.target.style.display = 'none'} />
                  {value?.url === ref.image_url && (
                    <div style={{ position: 'absolute', top: '4px', right: '4px', width: '18px', height: '18px', borderRadius: '50%', background: 'var(--blue)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', color: '#fff' }}>✓</div>
                  )}
                </div>
              ))}
              {/* Deselect option */}
              {value?.url && (
                <div onClick={() => onChange({ type: 'text', url: '', text: '' })}
                  style={{ borderRadius: '8px', border: '1px dashed var(--border2)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', aspectRatio: '1', fontSize: '10px', color: 'var(--text3)', fontFamily: 'var(--font-mono)', background: 'var(--bg3)', transition: 'all .2s' }}>
                  Clear
                </div>
              )}
            </div>
          )}
          {value?.url && (
            <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 10px', background: 'var(--blue-light)', border: '1px solid rgba(0,87,255,0.15)', borderRadius: '8px' }}>
              <img src={value.url} alt="" style={{ width: '32px', height: '32px', borderRadius: '6px', objectFit: 'cover', border: '1px solid var(--border)' }} />
              <span style={{ fontSize: '11px', color: 'var(--blue)', fontFamily: 'var(--font-mono)' }}>Reference selected ✓</span>
            </div>
          )}
        </div>
      )}

      {/* Upload new */}
      {mode === 'upload' && (
        <div>
          <div onClick={() => uploadRef.current?.click()}
            style={{ border: '1.5px dashed rgba(0,87,255,0.25)', borderRadius: '9px', padding: '16px', textAlign: 'center', cursor: 'pointer', background: 'var(--bg3)', transition: 'all .3s' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(0,87,255,0.5)'; e.currentTarget.style.background = 'rgba(0,87,255,0.02)' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(0,87,255,0.25)'; e.currentTarget.style.background = 'var(--bg3)' }}>
            <div style={{ fontSize: '20px', marginBottom: '4px' }}>↑</div>
            <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text)', marginBottom: '2px' }}>{uploading ? 'Uploading…' : 'Upload reference image'}</div>
            <div style={{ fontSize: '11px', color: 'var(--text3)' }}>JPG, PNG, WEBP</div>
          </div>
          <input ref={uploadRef} type="file" accept="image/*" onChange={handleUpload} style={{ display: 'none' }} />
          {value?.url && mode === 'upload' && (
            <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 10px', background: 'var(--blue-light)', border: '1px solid rgba(0,87,255,0.15)', borderRadius: '8px' }}>
              <img src={value.url} alt="" style={{ width: '32px', height: '32px', borderRadius: '6px', objectFit: 'cover' }} />
              <span style={{ fontSize: '11px', color: 'var(--blue)', fontFamily: 'var(--font-mono)' }}>Uploaded ✓</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function PromptsContent() {
  const { id } = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [project, setProject] = useState(null)
  const [summary, setSummary] = useState(null)
  const [refs, setRefs] = useState([])
  const [prompts, setPrompts] = useState([])
  const [mode, setMode] = useState('standard')
  const [outputType, setOutputType] = useState('image')
  const [tool, setTool] = useState('ChatGPT')
  const [ideaContext, setIdeaContext] = useState('')
  const [generatedPrompt, setGeneratedPrompt] = useState('')
  const [generating, setGenerating] = useState(false)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)

  // Design mode
  const [designProduct, setDesignProduct] = useState('')
  const [designCopy, setDesignCopy] = useState('')
  const [designFormat, setDesignFormat] = useState('Instagram Post (1:1)')
  const [designMood, setDesignMood] = useState('')
  const [designRefs, setDesignRefs] = useState({
    typography: { type: 'text', url: '', text: '' },
    background: { type: 'text', url: '', text: '' },
    product: { type: 'text', url: '', text: '' },
    color: { type: 'text', url: '', text: '' },
  })
  const [generatedDesignPrompt, setGeneratedDesignPrompt] = useState('')
  const [generatingDesign, setGeneratingDesign] = useState(false)

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
      supabase.from('projects').select('*, brands(*)').eq('id', id).single(),
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
    setGenerating(true)
    try {
      const res = await fetch('/api/prompts/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brandSummary: summary?.summary_text || project?.brands?.summary_text || '',
          refs: refs.map(r => ({ url: r.image_url, tag: r.tag })),
          idea: ideaContext,
          outputType, tool,
          projectName: project?.name,
        }),
      })
      const result = await res.json()
      if (result.prompt) setGeneratedPrompt(result.prompt)
    } catch (err) { alert('Generation failed: ' + err.message) }
    setGenerating(false)
  }

  async function generateDesign() {
    setGeneratingDesign(true)
    try {
      const res = await fetch('/api/prompts/design', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brandSummary: summary?.summary_text || project?.brands?.summary_text || '',
          projectName: project?.name,
          product: designProduct,
          copy: designCopy,
          format: designFormat,
          mood: designMood,
          designRefs,
          refs: refs.map(r => ({ url: r.image_url, tag: r.tag })),
        }),
      })
      const result = await res.json()
      if (result.prompt) setGeneratedDesignPrompt(result.prompt)
    } catch (err) { alert('Generation failed: ' + err.message) }
    setGeneratingDesign(false)
  }

  async function savePrompt(text, promptTool, type) {
    setSaving(true)
    await supabase.from('generated_prompts').insert({ project_id: id, output_type: type, tool: promptTool, prompt_text: text })
    setSaving(false)
    fetchAll()
  }

  function handleTypeChange(type) {
    setOutputType(type)
    setTool(TOOLS[type][0])
  }

  function updateDesignRef(key, val) {
    setDesignRefs(prev => ({ ...prev, [key]: val }))
  }

  if (loading) return <LoadingScreen />

  const brandSummary = summary?.summary_text || project?.brands?.summary_text || ''

  return (
    <div style={{ display: 'flex', height: '100vh', background: 'var(--bg)' }}>
      <Sidebar projectId={id} projectName={project?.name} brandName={project?.brands?.name} campaignType={project?.campaign_type} />
      <main style={{ flex: 1, overflowY: 'auto' }}>
        <div style={{ position: 'sticky', top: 0, zIndex: 10, padding: '16px 32px', background: 'rgba(248,248,252,0.9)', backdropFilter: 'blur(20px)', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', animation: 'slide-down .5s ease' }}>
          <div>
            <div style={{ fontSize: '18px', fontWeight: 700 }}>Prompt Builder</div>
            <div style={{ fontSize: '11px', color: 'var(--text3)', fontFamily: 'var(--font-mono)', marginTop: '2px' }}>{project?.name} · {prompts.length} prompts saved</div>
          </div>
        </div>

        <div style={{ padding: '28px 32px' }}>

          {/* Mode selector */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '24px', animation: 'reveal .5s ease both', opacity: 0 }}>
            {MODES.map(m => (
              <button key={m.id} onClick={() => setMode(m.id)}
                style={{ padding: '16px 20px', borderRadius: '14px', border: `1.5px solid ${mode === m.id ? 'rgba(0,87,255,0.35)' : 'var(--border)'}`, background: mode === m.id ? 'var(--blue-light)' : 'var(--bg2)', cursor: 'pointer', textAlign: 'left', transition: 'all .2s', boxShadow: mode === m.id ? 'var(--shadow-blue)' : 'var(--shadow)', fontFamily: 'var(--font-ui)' }}>
                <div style={{ fontSize: '14px', fontWeight: 700, color: mode === m.id ? 'var(--blue)' : 'var(--text)', marginBottom: '4px' }}>{m.label}</div>
                <div style={{ fontSize: '12px', color: 'var(--text3)', lineHeight: 1.5 }}>{m.desc}</div>
              </button>
            ))}
          </div>

          {/* ── STANDARD PROMPT BUILDER ── */}
          {mode === 'standard' && (
            <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '16px', padding: '24px', marginBottom: '20px', boxShadow: 'var(--shadow)', animation: 'reveal .5s ease both', opacity: 0 }}>
              <Label>Context loaded</Label>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '20px' }}>
                {brandSummary && <CtxTag color="blue">✦ Brand Summary</CtxTag>}
                {refs.length > 0 && <CtxTag color="teal">◈ {refs.length} References</CtxTag>}
                {ideaContext && <CtxTag color="purple">⚡ {ideaContext.slice(0, 40)}{ideaContext.length > 40 ? '…' : ''}</CtxTag>}
                {!brandSummary && !refs.length && !ideaContext && <span style={{ fontSize: '12px', color: 'var(--text3)', fontFamily: 'var(--font-mono)' }}>No context loaded yet</span>}
              </div>

              <Label>Campaign idea / brief</Label>
              <textarea value={ideaContext} onChange={e => setIdeaContext(e.target.value)}
                placeholder="Paste a brainstorm idea or describe what the visual should be about…"
                style={{ width: '100%', padding: '12px 14px', background: 'var(--bg3)', border: '1.5px solid var(--border)', borderRadius: '10px', color: 'var(--text)', fontFamily: 'var(--font-ui)', fontSize: '13px', lineHeight: 1.6, resize: 'none', minHeight: '70px', outline: 'none', transition: 'border-color .2s', marginBottom: '18px' }}
                onFocus={e => e.target.style.borderColor = 'rgba(0,87,255,0.4)'}
                onBlur={e => e.target.style.borderColor = 'var(--border)'} />

              <Label>Output type</Label>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '14px' }}>
                {['image', 'video'].map(type => (
                  <button key={type} onClick={() => handleTypeChange(type)}
                    style={{ flex: 1, padding: '10px 14px', borderRadius: '10px', border: `1.5px solid ${outputType === type ? 'rgba(0,87,255,0.4)' : 'var(--border)'}`, background: outputType === type ? 'var(--blue-light)' : 'var(--bg3)', color: outputType === type ? 'var(--blue)' : 'var(--text2)', fontFamily: 'var(--font-ui)', fontSize: '13px', fontWeight: 600, cursor: 'pointer', transition: 'all .2s', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    {type === 'image' ? '🖼 Image' : '🎬 Video'}<span style={{ fontSize: '10px', opacity: .5 }}>▼</span>
                  </button>
                ))}
              </div>

              <Label>AI Tool</Label>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '20px' }}>
                {TOOLS[outputType].map(t => (
                  <button key={t} onClick={() => setTool(t)}
                    style={{ padding: '7px 14px', borderRadius: '9px', border: `1.5px solid ${tool === t ? 'rgba(0,87,255,0.4)' : 'var(--border)'}`, background: tool === t ? 'var(--blue-light)' : 'var(--bg3)', color: tool === t ? 'var(--blue)' : 'var(--text2)', fontFamily: 'var(--font-ui)', fontSize: '12px', fontWeight: 600, cursor: 'pointer', transition: 'all .2s' }}>
                    {t}
                  </button>
                ))}
              </div>

              <Label>Generated prompt</Label>
              <div style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: '10px', padding: '16px', fontFamily: 'var(--font-mono)', fontSize: '12px', color: generatedPrompt ? 'var(--text2)' : 'var(--text3)', lineHeight: 1.85, minHeight: '110px', marginBottom: '16px' }}>
                {generating
                  ? <span style={{ color: 'var(--blue)', display: 'flex', alignItems: 'center', gap: '10px' }}><span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--blue)', display: 'inline-block', animation: 'dot-beat 1s ease-in-out infinite' }} />Claude is crafting your prompt…</span>
                  : generatedPrompt
                    ? <>{generatedPrompt}<span style={{ display: 'inline-block', width: '2px', height: '13px', background: 'var(--blue)', marginLeft: '2px', verticalAlign: 'text-bottom', animation: 'blink 1s step-end infinite' }} /></>
                    : 'Your prompt will appear here…'}
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button onClick={generate} disabled={generating}
                  style={{ flex: 1, padding: '10px', background: generating ? 'rgba(0,87,255,0.5)' : 'var(--blue)', color: '#fff', border: 'none', borderRadius: '10px', fontFamily: 'var(--font-ui)', fontSize: '13px', fontWeight: 700, letterSpacing: '.05em', textTransform: 'uppercase', cursor: generating ? 'not-allowed' : 'pointer', boxShadow: 'var(--shadow-blue)', transition: 'all .2s' }}>
                  {generating ? 'Generating…' : 'Generate Prompt'}
                </button>
                {generatedPrompt && <>
                  <CopyBtn text={generatedPrompt} />
                  <button onClick={() => savePrompt(generatedPrompt, tool, outputType)} disabled={saving}
                    style={{ padding: '10px 20px', background: 'transparent', border: '1px solid var(--border2)', borderRadius: '10px', fontSize: '12px', fontWeight: 700, color: 'var(--text2)', cursor: 'pointer', fontFamily: 'var(--font-ui)' }}>
                    {saving ? 'Saving…' : 'Save'}
                  </button>
                  <button onClick={generate} style={{ padding: '10px 16px', background: 'transparent', border: '1px solid var(--border2)', borderRadius: '10px', fontSize: '14px', color: 'var(--text2)', cursor: 'pointer' }}>↺</button>
                </>}
              </div>
            </div>
          )}

          {/* ── FULL DESIGN GENERATION ── */}
          {mode === 'design' && (
            <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '16px', padding: '24px', marginBottom: '20px', boxShadow: 'var(--shadow)', animation: 'reveal .5s ease both', opacity: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'var(--blue-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>⬡</div>
                <div>
                  <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text)' }}>Full Design Generation</div>
                  <div style={{ fontSize: '12px', color: 'var(--text3)' }}>Complete ChatGPT prompt — pull references directly from your Reference Board or upload new ones</div>
                </div>
              </div>

              <div style={{ height: '1px', background: 'var(--border)', margin: '18px 0' }} />

              {/* Basic fields */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
                <div>
                  <Label>Product / Subject</Label>
                  <input value={designProduct} onChange={e => setDesignProduct(e.target.value)}
                    placeholder="e.g. Nike Air Max, Coffee bag, Perfume bottle"
                    style={inputStyle}
                    onFocus={e => e.target.style.borderColor = 'rgba(0,87,255,0.4)'}
                    onBlur={e => e.target.style.borderColor = 'var(--border)'} />
                </div>
                <div>
                  <Label>Design Format</Label>
                  <select value={designFormat} onChange={e => setDesignFormat(e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
                    {['Instagram Post (1:1)', 'Instagram Story (9:16)', 'Facebook Ad (4:5)', 'Billboard (16:9)', 'Banner (3:1)', 'Square Poster (1:1)', 'A4 Poster', 'Custom'].map(f => (
                      <option key={f} value={f}>{f}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ marginBottom: '14px' }}>
                <Label>Copy / Text in Design</Label>
                <textarea value={designCopy} onChange={e => setDesignCopy(e.target.value)}
                  placeholder="e.g. Headline: 'Just Do It' · Subline: 'Summer 2025' · CTA: 'Shop Now'"
                  style={{ ...inputStyle, minHeight: '70px', resize: 'vertical' }}
                  onFocus={e => e.target.style.borderColor = 'rgba(0,87,255,0.4)'}
                  onBlur={e => e.target.style.borderColor = 'var(--border)'} />
              </div>

              <div style={{ marginBottom: '22px' }}>
                <Label>Overall Mood (optional)</Label>
                <input value={designMood} onChange={e => setDesignMood(e.target.value)}
                  placeholder="e.g. Dark luxury, Warm earthy tones, Minimal editorial"
                  style={inputStyle}
                  onFocus={e => e.target.style.borderColor = 'rgba(0,87,255,0.4)'}
                  onBlur={e => e.target.style.borderColor = 'var(--border)'} />
              </div>

              {/* Reference fields */}
              <div style={{ background: 'var(--bg3)', borderRadius: '12px', padding: '18px', border: '1px solid var(--border)', marginBottom: '20px' }}>
                <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>Visual References</span>
                  <span style={{ padding: '2px 8px', borderRadius: '6px', background: 'var(--blue-light)', border: '1px solid rgba(0,87,255,0.15)', color: 'var(--blue)', fontSize: '10px', fontFamily: 'var(--font-mono)', textTransform: 'none', letterSpacing: 0 }}>
                    Pull from Reference Board or upload new
                  </span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '18px' }}>
                  {DESIGN_FIELDS.map(field => (
                    <div key={field.key}>
                      <Label>{field.label}</Label>
                      <RefPicker
                        tag={field.tag}
                        refs={refs}
                        value={designRefs[field.key]}
                        onChange={val => updateDesignRef(field.key, val)}
                        placeholder={field.placeholder}
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Context active */}
              {(brandSummary || refs.length > 0) && (
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '16px', padding: '10px 14px', background: 'var(--bg3)', borderRadius: '10px', border: '1px solid var(--border)' }}>
                  <span style={{ fontSize: '11px', color: 'var(--text3)', fontFamily: 'var(--font-mono)', marginRight: '4px' }}>Context:</span>
                  {brandSummary && <CtxTag color="blue">✦ Brand Summary</CtxTag>}
                  {refs.length > 0 && <CtxTag color="teal">◈ {refs.length} Board References</CtxTag>}
                </div>
              )}

              {/* Generated prompt */}
              {generatedDesignPrompt && (
                <>
                  <Label>Generated ChatGPT Design Prompt</Label>
                  <div style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: '10px', padding: '18px', fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text2)', lineHeight: 1.9, marginBottom: '14px', whiteSpace: 'pre-wrap' }}>
                    {generatedDesignPrompt}
                  </div>
                </>
              )}

              <div style={{ display: 'flex', gap: '10px' }}>
                <button onClick={generateDesign} disabled={generatingDesign}
                  style={{ flex: 1, padding: '11px', background: generatingDesign ? 'rgba(0,87,255,0.5)' : 'var(--blue)', color: '#fff', border: 'none', borderRadius: '10px', fontFamily: 'var(--font-ui)', fontSize: '13px', fontWeight: 700, letterSpacing: '.05em', textTransform: 'uppercase', cursor: generatingDesign ? 'not-allowed' : 'pointer', boxShadow: 'var(--shadow-blue)', transition: 'all .2s' }}>
                  {generatingDesign ? '⬡ Generating…' : '⬡ Generate Full Design Prompt'}
                </button>
                {generatedDesignPrompt && <>
                  <CopyBtn text={generatedDesignPrompt} />
                  <button onClick={() => savePrompt(generatedDesignPrompt, 'ChatGPT', 'image')} disabled={saving}
                    style={{ padding: '11px 20px', background: 'transparent', border: '1px solid var(--border2)', borderRadius: '10px', fontSize: '12px', fontWeight: 700, color: 'var(--text2)', cursor: 'pointer', fontFamily: 'var(--font-ui)' }}>
                    {saving ? 'Saving…' : 'Save'}
                  </button>
                  <button onClick={generateDesign} style={{ padding: '11px 16px', background: 'transparent', border: '1px solid var(--border2)', borderRadius: '10px', fontSize: '14px', color: 'var(--text2)', cursor: 'pointer' }}>↺</button>
                </>}
              </div>
            </div>
          )}

          {/* Saved prompts */}
          {prompts.length > 0 && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', animation: 'reveal .5s .1s ease both', opacity: 0 }}>
                <span style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '.1em', color: 'var(--text3)', textTransform: 'uppercase' }}>Saved Prompts ({prompts.length})</span>
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

const inputStyle = {
  width: '100%', padding: '10px 14px',
  background: 'var(--bg3)', border: '1.5px solid var(--border)',
  borderRadius: '10px', color: 'var(--text)',
  fontFamily: 'var(--font-ui)', fontSize: '13px',
  outline: 'none', transition: 'border-color .2s', display: 'block',
}

function Label({ children }) {
  return <div style={{ fontSize: '10px', fontFamily: 'var(--font-mono)', letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--text3)', marginBottom: '8px', fontWeight: 500 }}>{children}</div>
}

function CtxTag({ color, children }) {
  const colors = {
    blue: { bg: 'var(--blue-light)', border: 'rgba(0,87,255,0.25)', text: 'var(--blue)' },
    teal: { bg: 'rgba(0,200,180,0.06)', border: 'rgba(0,200,180,0.25)', text: '#00c8b4' },
    purple: { bg: 'rgba(160,80,255,0.06)', border: 'rgba(160,80,255,0.25)', text: '#a050ff' },
  }
  const c = colors[color]
  return <span style={{ padding: '5px 12px', borderRadius: '20px', fontSize: '11px', fontFamily: 'var(--font-mono)', border: `1px solid ${c.border}`, background: c.bg, color: c.text }}>{children}</span>
}

function CopyBtn({ text }) {
  const [copied, setCopied] = useState(false)
  return (
    <button onClick={async () => { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000) }}
      style={{ padding: '10px 20px', background: copied ? 'rgba(34,204,136,0.1)' : 'var(--bg3)', border: `1px solid ${copied ? 'rgba(34,204,136,0.3)' : 'var(--border2)'}`, borderRadius: '10px', fontSize: '12px', fontWeight: 700, color: copied ? '#22cc88' : 'var(--text2)', cursor: 'pointer', fontFamily: 'var(--font-ui)', transition: 'all .2s' }}>
      {copied ? '✓ Copied!' : 'Copy'}
    </button>
  )
}

function SavedPrompt({ prompt }) {
  const [hover, setHover] = useState(false)
  return (
    <div onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{ background: 'var(--bg2)', border: `1px solid ${hover ? 'rgba(0,87,255,0.2)' : 'var(--border)'}`, borderRadius: '12px', padding: '16px 18px', transition: 'all .25s', transform: hover ? 'translateX(3px)' : 'none', boxShadow: hover ? 'var(--shadow-hover)' : 'var(--shadow)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
        <span style={{ fontSize: '10px', letterSpacing: '.12em', textTransform: 'uppercase', fontFamily: 'var(--font-mono)', color: 'var(--blue)', fontWeight: 500 }}>{prompt.tool} · {prompt.output_type}</span>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <span style={{ fontSize: '10px', fontFamily: 'var(--font-mono)', color: 'var(--text3)' }}>{new Date(prompt.created_at).toLocaleDateString()}</span>
          <CopyBtn text={prompt.prompt_text} />
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
