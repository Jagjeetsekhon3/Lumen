'use client'
import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useParams, useRouter } from 'next/navigation'
import Sidebar from '@/components/Sidebar'

const VIDEO_TOOLS = ['Kling', 'Seedance', 'Runway', 'Google VEO', 'Grok', 'Minimax', 'Sora', 'Wan']

const MODES = [
  { id: 'script', icon: '📝', label: 'Script to Video', desc: 'Paste script → Claude breaks into scenes → per-scene prompts' },
  { id: 'image2video', icon: '🖼→🎬', label: 'Image to Video', desc: 'Upload or paste your image → Claude generates motion prompt for each tool' },
]

const MOTION_STYLES = [
  'Slow zoom in', 'Slow zoom out', 'Pan left to right', 'Pan right to left',
  'Tilt up', 'Tilt down', 'Orbit around subject', 'Dolly forward',
  'Dolly back', 'Handheld shake', 'Static locked off', 'Drone rise',
  'Whip pan', 'Push in', 'Pull back reveal', 'Custom',
]

export default function VideoScriptPage() {
  const { id } = useParams()
  const router = useRouter()
  const [project, setProject] = useState(null)
  const [summary, setSummary] = useState(null)
  const [refs, setRefs] = useState([])
  const [loading, setLoading] = useState(true)
  const [mode, setMode] = useState('script')

  // Script mode
  const [script, setScript] = useState('')
  const [tool, setTool] = useState('Kling')
  const [scenes, setScenes] = useState([])
  const [generating, setGenerating] = useState(false)
  const [copiedId, setCopiedId] = useState(null)
  const [copiedAll, setCopiedAll] = useState(false)
  const [expandedId, setExpandedId] = useState(null)

  // Image to video mode
  const [imageSource, setImageSource] = useState('upload') // 'upload' | 'url' | 'refs'
  const [uploadedImage, setUploadedImage] = useState(null) // { url, name }
  const [imageUrl, setImageUrl] = useState('')
  const [selectedRef, setSelectedRef] = useState(null)
  const [motionStyle, setMotionStyle] = useState('Slow zoom in')
  const [customMotion, setCustomMotion] = useState('')
  const [motionDuration, setMotionDuration] = useState('4s')
  const [motionMood, setMotionMood] = useState('')
  const [i2vTool, setI2vTool] = useState('Kling')
  const [i2vPrompts, setI2vPrompts] = useState([])
  const [generatingI2v, setGeneratingI2v] = useState(false)
  const [copiedI2v, setCopiedI2v] = useState(null)
  const [uploadingImage, setUploadingImage] = useState(false)
  const imageUploadRef = useRef()

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

  // ── Script mode ──
  async function generateScenes() {
    if (!script.trim()) return
    setGenerating(true)
    setScenes([])
    try {
      const res = await fetch('/api/videoscript/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          script, tool,
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
          scene: scene.description, sceneNum: scene.scene, tool,
          brandSummary: summary?.summary_text || project?.brands?.summary_text || '',
          refs: refs.map(r => ({ url: r.image_url, tag: r.tag })),
        }),
      })
      const result = await res.json()
      if (result.prompt) setScenes(prev => prev.map((s, i) => i === sceneIndex ? { ...s, prompt: result.prompt, regenerating: false } : s))
    } catch (err) { setScenes(prev => prev.map((s, i) => i === sceneIndex ? { ...s, regenerating: false } : s)) }
  }

  async function copyScene(scene, sceneId) {
    await navigator.clipboard.writeText(scene.prompt)
    setCopiedId(sceneId)
    setTimeout(() => setCopiedId(null), 2000)
  }

  async function copyAll() {
    const allPrompts = scenes.map(s => `SCENE ${s.scene} — ${s.title}\nDuration: ${s.duration}\n\n${s.prompt}`).join('\n\n─────────────────\n\n')
    await navigator.clipboard.writeText(allPrompts)
    setCopiedAll(true)
    setTimeout(() => setCopiedAll(false), 2500)
  }

  // ── Image to Video mode ──
  async function handleImageUpload(e) {
    const file = e.target.files[0]
    if (!file) return
    setUploadingImage(true)
    const { data: { user } } = await supabase.auth.getUser()
    const path = `${user.id}/${id}/i2v-${Date.now()}-${file.name}`
    const { error } = await supabase.storage.from('reference-images').upload(path, file)
    if (!error) {
      const { data: { publicUrl } } = supabase.storage.from('reference-images').getPublicUrl(path)
      setUploadedImage({ url: publicUrl, name: file.name })
    }
    setUploadingImage(false)
  }

  function getActiveImage() {
    if (imageSource === 'upload') return uploadedImage?.url || null
    if (imageSource === 'url') return imageUrl.trim() || null
    if (imageSource === 'refs') return selectedRef?.image_url || null
    return null
  }

  async function generateI2VPrompts() {
    const activeImage = getActiveImage()
    if (!activeImage) return alert('Please provide an image first')
    setGeneratingI2v(true)
    setI2vPrompts([])
    try {
      const res = await fetch('/api/videoscript/image2video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageUrl: activeImage,
          motionStyle: motionStyle === 'Custom' ? customMotion : motionStyle,
          duration: motionDuration,
          mood: motionMood,
          tool: i2vTool,
          brandSummary: summary?.summary_text || project?.brands?.summary_text || '',
          projectName: project?.name,
        }),
      })
      const result = await res.json()
      if (result.prompts) setI2vPrompts(result.prompts)
    } catch (err) { alert('Generation failed: ' + err.message) }
    setGeneratingI2v(false)
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
            <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text)' }}>Video</div>
            <div style={{ fontSize: '11px', color: 'var(--text3)', fontFamily: 'var(--font-mono)', marginTop: '2px' }}>{project?.name} · Script to Video · Image to Video</div>
          </div>
          {mode === 'script' && scenes.length > 0 && (
            <button onClick={copyAll}
              style={{ padding: '9px 18px', background: copiedAll ? 'rgba(34,204,136,0.1)' : 'var(--blue)', color: copiedAll ? '#22cc88' : '#fff', border: copiedAll ? '1px solid rgba(34,204,136,0.3)' : 'none', borderRadius: '9px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-ui)', letterSpacing: '.04em', textTransform: 'uppercase', boxShadow: copiedAll ? 'none' : 'var(--shadow-blue)', transition: 'all .2s' }}>
              {copiedAll ? '✓ All Copied!' : `Copy All ${scenes.length} Scenes`}
            </button>
          )}
        </div>

        <div style={{ padding: '28px 32px' }}>

          {/* Mode selector */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '24px', animation: 'reveal .5s ease both', opacity: 0 }}>
            {MODES.map(m => (
              <button key={m.id} onClick={() => setMode(m.id)}
                style={{ padding: '16px 20px', borderRadius: '14px', border: `1.5px solid ${mode === m.id ? 'rgba(0,87,255,0.35)' : 'var(--border)'}`, background: mode === m.id ? 'var(--blue-light)' : 'var(--bg2)', cursor: 'pointer', textAlign: 'left', transition: 'all .2s', boxShadow: mode === m.id ? 'var(--shadow-blue)' : 'var(--shadow)', fontFamily: 'var(--font-ui)' }}>
                <div style={{ fontSize: '18px', marginBottom: '6px' }}>{m.icon}</div>
                <div style={{ fontSize: '14px', fontWeight: 700, color: mode === m.id ? 'var(--blue)' : 'var(--text)', marginBottom: '4px' }}>{m.label}</div>
                <div style={{ fontSize: '12px', color: 'var(--text3)', lineHeight: 1.5 }}>{m.desc}</div>
              </button>
            ))}
          </div>

          {/* ── SCRIPT TO VIDEO ── */}
          {mode === 'script' && (
            <>
              <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '16px', padding: '24px', marginBottom: '24px', boxShadow: 'var(--shadow)', animation: 'reveal .5s ease both', opacity: 0 }}>
                {/* Context */}
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '18px', padding: '10px 14px', background: 'var(--bg3)', borderRadius: '10px', border: '1px solid var(--border)' }}>
                  <span style={{ fontSize: '11px', color: 'var(--text3)', fontFamily: 'var(--font-mono)', marginRight: '4px' }}>Context:</span>
                  {brandSummary ? <CtxTag color="blue">✦ Brand Summary</CtxTag> : <span style={{ fontSize: '11px', color: 'var(--text3)', fontFamily: 'var(--font-mono)' }}>No brand summary</span>}
                  {refs.length > 0 && <CtxTag color="teal">◈ {refs.length} References</CtxTag>}
                </div>

                <Label>Video Tool</Label>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '18px' }}>
                  {VIDEO_TOOLS.map(t => (
                    <button key={t} onClick={() => setTool(t)}
                      style={{ padding: '7px 14px', borderRadius: '9px', border: `1.5px solid ${tool === t ? 'rgba(0,87,255,0.4)' : 'var(--border)'}`, background: tool === t ? 'var(--blue-light)' : 'var(--bg3)', color: tool === t ? 'var(--blue)' : 'var(--text2)', fontFamily: 'var(--font-ui)', fontSize: '12px', fontWeight: 600, cursor: 'pointer', transition: 'all .2s' }}>
                      {t}
                    </button>
                  ))}
                </div>

                <Label>Paste Video Script</Label>
                <textarea value={script} onChange={e => setScript(e.target.value)}
                  placeholder={`Paste your full video script here…\n\nAny format works — numbered scenes, timestamps, paragraphs, shooting script.`}
                  style={{ width: '100%', minHeight: '180px', padding: '14px', background: 'var(--bg3)', border: '1.5px solid var(--border)', borderRadius: '12px', color: 'var(--text)', fontFamily: 'var(--font-ui)', fontSize: '13px', lineHeight: 1.75, resize: 'vertical', outline: 'none', transition: 'border-color .2s', marginBottom: '16px' }}
                  onFocus={e => e.target.style.borderColor = 'rgba(0,87,255,0.4)'}
                  onBlur={e => e.target.style.borderColor = 'var(--border)'} />

                <button onClick={generateScenes} disabled={generating || !script.trim()}
                  style={{ width: '100%', padding: '12px', background: generating ? 'rgba(0,87,255,0.5)' : 'var(--blue)', color: '#fff', border: 'none', borderRadius: '10px', fontFamily: 'var(--font-ui)', fontSize: '13px', fontWeight: 700, letterSpacing: '.05em', textTransform: 'uppercase', cursor: generating ? 'not-allowed' : 'pointer', boxShadow: 'var(--shadow-blue)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                  {generating ? <><Spinner />Generating scene prompts…</> : `🎬 Generate ${tool} Prompts for All Scenes`}
                </button>
              </div>

              {/* Scene cards */}
              {generating && <GeneratingBar message={`Claude is breaking script into scenes and generating ${tool} prompts…`} />}
              {scenes.length > 0 && (
                <div style={{ animation: 'reveal .5s ease both', opacity: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '.1em', color: 'var(--text3)', textTransform: 'uppercase' }}>{scenes.length} Scenes</span>
                      <span style={{ padding: '3px 9px', borderRadius: '6px', background: 'var(--blue-light)', border: '1px solid rgba(0,87,255,0.15)', fontSize: '11px', color: 'var(--blue)', fontFamily: 'var(--font-mono)' }}>{tool}</span>
                    </div>
                    <button onClick={() => { setScenes([]); setScript('') }}
                      style={{ padding: '6px 12px', background: 'transparent', border: '1px solid var(--border2)', borderRadius: '8px', fontSize: '11px', color: 'var(--text3)', cursor: 'pointer', fontFamily: 'var(--font-ui)' }}>
                      Start Over
                    </button>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {scenes.map((scene, i) => (
                      <SceneCard key={i} scene={scene} index={i} tool={tool} copiedId={copiedId} expanded={expandedId === i}
                        onToggle={() => setExpandedId(expandedId === i ? null : i)}
                        onCopy={() => copyScene(scene, i)}
                        onRegenerate={() => regenerateScene(i)} />
                    ))}
                  </div>
                  {/* Shot list */}
                  <ShotList scenes={scenes} copiedAll={copiedAll} onCopy={copyAll} />
                </div>
              )}
              {!generating && scenes.length === 0 && <EmptyState icon="📝" title="Paste your video script above" desc="Claude reads the full script, breaks it into scenes, and generates a tool-specific prompt for each frame with brand context baked in." />}
            </>
          )}

          {/* ── IMAGE TO VIDEO ── */}
          {mode === 'image2video' && (
            <div style={{ animation: 'reveal .5s ease both', opacity: 0 }}>
              <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '16px', padding: '24px', marginBottom: '20px', boxShadow: 'var(--shadow)' }}>

                {/* Image source tabs */}
                <Label>Source Image</Label>
                <div style={{ display: 'flex', gap: '4px', marginBottom: '16px', background: 'var(--bg3)', borderRadius: '10px', padding: '4px', border: '1px solid var(--border)' }}>
                  {[
                    { id: 'upload', label: '↑ Upload Image' },
                    { id: 'url', label: '🔗 Paste URL' },
                    { id: 'refs', label: `🎨 From References${refs.length > 0 ? ` (${refs.length})` : ''}` },
                  ].map(tab => (
                    <button key={tab.id} onClick={() => setImageSource(tab.id)}
                      style={{ flex: 1, padding: '8px', borderRadius: '7px', fontSize: '11px', fontWeight: 700, cursor: 'pointer', transition: 'all .2s', color: imageSource === tab.id ? 'var(--blue)' : 'var(--text3)', background: imageSource === tab.id ? 'var(--bg2)' : 'transparent', border: 'none', fontFamily: 'var(--font-ui)', letterSpacing: '.04em', textTransform: 'uppercase', boxShadow: imageSource === tab.id ? 'var(--shadow)' : 'none' }}>
                      {tab.label}
                    </button>
                  ))}
                </div>

                {/* Upload */}
                {imageSource === 'upload' && (
                  <div style={{ marginBottom: '16px' }}>
                    <div onClick={() => imageUploadRef.current?.click()}
                      style={{ border: `1.5px dashed rgba(0,87,255,${uploadedImage ? '.4' : '.2'})`, borderRadius: '12px', padding: '24px', textAlign: 'center', cursor: 'pointer', background: uploadedImage ? 'rgba(0,87,255,0.02)' : 'var(--bg3)', transition: 'all .3s' }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(0,87,255,0.5)'; e.currentTarget.style.background = 'rgba(0,87,255,0.02)' }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = uploadedImage ? 'rgba(0,87,255,0.4)' : 'rgba(0,87,255,0.2)'; e.currentTarget.style.background = uploadedImage ? 'rgba(0,87,255,0.02)' : 'var(--bg3)' }}>
                      {uploadedImage ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', justifyContent: 'center' }}>
                          <img src={uploadedImage.url} alt="" style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: '10px', border: '1px solid var(--border)' }} />
                          <div style={{ textAlign: 'left' }}>
                            <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)', marginBottom: '4px' }}>{uploadedImage.name}</div>
                            <div style={{ fontSize: '11px', color: 'var(--blue)', fontFamily: 'var(--font-mono)' }}>✓ Image ready</div>
                            <div style={{ fontSize: '11px', color: 'var(--text3)', marginTop: '4px' }}>Click to replace</div>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div style={{ fontSize: '32px', marginBottom: '8px' }}>{uploadingImage ? '…' : '🖼'}</div>
                          <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)', marginBottom: '3px' }}>{uploadingImage ? 'Uploading…' : 'Upload your image'}</div>
                          <div style={{ fontSize: '11px', color: 'var(--text3)' }}>JPG, PNG, WEBP — the image you want to animate</div>
                        </>
                      )}
                    </div>
                    <input ref={imageUploadRef} type="file" accept="image/*" onChange={handleImageUpload} style={{ display: 'none' }} />
                  </div>
                )}

                {/* URL */}
                {imageSource === 'url' && (
                  <div style={{ marginBottom: '16px' }}>
                    <input value={imageUrl} onChange={e => setImageUrl(e.target.value)}
                      placeholder="Paste image URL — from Midjourney, ChatGPT, anywhere…"
                      style={{ width: '100%', padding: '11px 14px', background: 'var(--bg3)', border: '1.5px solid var(--border)', borderRadius: '10px', color: 'var(--text)', fontFamily: 'var(--font-ui)', fontSize: '13px', outline: 'none', transition: 'border-color .2s', marginBottom: '10px' }}
                      onFocus={e => e.target.style.borderColor = 'rgba(0,87,255,0.4)'}
                      onBlur={e => e.target.style.borderColor = 'var(--border)'} />
                    {imageUrl.trim() && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 14px', background: 'var(--bg3)', borderRadius: '10px', border: '1px solid var(--border)' }}>
                        <img src={imageUrl.trim()} alt="preview" style={{ width: '56px', height: '56px', objectFit: 'cover', borderRadius: '8px', border: '1px solid var(--border)', flexShrink: 0 }} onError={e => e.target.style.display = 'none'} />
                        <div style={{ fontSize: '12px', color: 'var(--text2)' }}>Preview loaded — ready to animate</div>
                      </div>
                    )}
                  </div>
                )}

                {/* From References */}
                {imageSource === 'refs' && (
                  <div style={{ marginBottom: '16px' }}>
                    {refs.length === 0 ? (
                      <div style={{ padding: '20px', background: 'var(--bg3)', borderRadius: '10px', textAlign: 'center', fontSize: '13px', color: 'var(--text3)' }}>
                        No references uploaded yet — <a href={`/project/${id}/references`} style={{ color: 'var(--blue)', fontWeight: 600 }}>go to References</a> to add some
                      </div>
                    ) : (
                      <>
                        <div style={{ fontSize: '11px', color: 'var(--text3)', fontFamily: 'var(--font-mono)', marginBottom: '10px' }}>Select the image you want to animate:</div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '8px' }}>
                          {refs.map(ref => (
                            <div key={ref.id} onClick={() => setSelectedRef(ref)}
                              style={{ borderRadius: '10px', overflow: 'hidden', border: `2px solid ${selectedRef?.id === ref.id ? 'var(--blue)' : 'var(--border)'}`, cursor: 'pointer', transition: 'all .2s', position: 'relative', aspectRatio: '1', background: 'var(--bg3)' }}>
                              <img src={ref.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => e.target.style.display = 'none'} />
                              <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '4px 6px', background: 'rgba(0,0,0,0.6)', fontSize: '9px', color: '#fff', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '.06em' }}>{ref.tag}</div>
                              {selectedRef?.id === ref.id && (
                                <div style={{ position: 'absolute', top: '6px', right: '6px', width: '20px', height: '20px', borderRadius: '50%', background: 'var(--blue)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', color: '#fff' }}>✓</div>
                              )}
                            </div>
                          ))}
                        </div>
                        {selectedRef && (
                          <div style={{ marginTop: '10px', display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', background: 'var(--blue-light)', border: '1px solid rgba(0,87,255,0.15)', borderRadius: '10px' }}>
                            <img src={selectedRef.image_url} alt="" style={{ width: '40px', height: '40px', borderRadius: '7px', objectFit: 'cover' }} />
                            <span style={{ fontSize: '12px', color: 'var(--blue)', fontFamily: 'var(--font-mono)' }}>Selected: {selectedRef.tag} reference ✓</span>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}

                <div style={{ height: '1px', background: 'var(--border)', margin: '4px 0 18px' }} />

                {/* Motion settings */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '16px' }}>
                  <div>
                    <Label>Motion Style</Label>
                    <select value={motionStyle} onChange={e => setMotionStyle(e.target.value)}
                      style={{ width: '100%', padding: '10px 14px', background: 'var(--bg3)', border: '1.5px solid var(--border)', borderRadius: '10px', color: 'var(--text)', fontFamily: 'var(--font-ui)', fontSize: '13px', outline: 'none', cursor: 'pointer' }}>
                      {MOTION_STYLES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                    {motionStyle === 'Custom' && (
                      <input value={customMotion} onChange={e => setCustomMotion(e.target.value)}
                        placeholder="Describe the motion…"
                        style={{ width: '100%', padding: '9px 14px', background: 'var(--bg3)', border: '1.5px solid var(--border)', borderRadius: '10px', color: 'var(--text)', fontFamily: 'var(--font-ui)', fontSize: '13px', outline: 'none', marginTop: '8px' }}
                        onFocus={e => e.target.style.borderColor = 'rgba(0,87,255,0.4)'}
                        onBlur={e => e.target.style.borderColor = 'var(--border)'} />
                    )}
                  </div>
                  <div>
                    <Label>Duration</Label>
                    <select value={motionDuration} onChange={e => setMotionDuration(e.target.value)}
                      style={{ width: '100%', padding: '10px 14px', background: 'var(--bg3)', border: '1.5px solid var(--border)', borderRadius: '10px', color: 'var(--text)', fontFamily: 'var(--font-ui)', fontSize: '13px', outline: 'none', cursor: 'pointer' }}>
                      {['2s', '3s', '4s', '5s', '6s', '8s', '10s'].map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <Label>Mood / Atmosphere (optional)</Label>
                  <input value={motionMood} onChange={e => setMotionMood(e.target.value)}
                    placeholder="e.g. Cinematic, dreamy, tense, energetic, peaceful…"
                    style={{ width: '100%', padding: '10px 14px', background: 'var(--bg3)', border: '1.5px solid var(--border)', borderRadius: '10px', color: 'var(--text)', fontFamily: 'var(--font-ui)', fontSize: '13px', outline: 'none', transition: 'border-color .2s' }}
                    onFocus={e => e.target.style.borderColor = 'rgba(0,87,255,0.4)'}
                    onBlur={e => e.target.style.borderColor = 'var(--border)'} />
                </div>

                {/* Tool */}
                <Label>Video Tool</Label>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '20px' }}>
                  {VIDEO_TOOLS.map(t => (
                    <button key={t} onClick={() => setI2vTool(t)}
                      style={{ padding: '7px 14px', borderRadius: '9px', border: `1.5px solid ${i2vTool === t ? 'rgba(0,87,255,0.4)' : 'var(--border)'}`, background: i2vTool === t ? 'var(--blue-light)' : 'var(--bg3)', color: i2vTool === t ? 'var(--blue)' : 'var(--text2)', fontFamily: 'var(--font-ui)', fontSize: '12px', fontWeight: 600, cursor: 'pointer', transition: 'all .2s' }}>
                      {t}
                    </button>
                  ))}
                </div>

                <button onClick={generateI2VPrompts} disabled={generatingI2v || !getActiveImage()}
                  style={{ width: '100%', padding: '12px', background: generatingI2v ? 'rgba(0,87,255,0.5)' : !getActiveImage() ? 'rgba(0,87,255,0.3)' : 'var(--blue)', color: '#fff', border: 'none', borderRadius: '10px', fontFamily: 'var(--font-ui)', fontSize: '13px', fontWeight: 700, letterSpacing: '.05em', textTransform: 'uppercase', cursor: generatingI2v || !getActiveImage() ? 'not-allowed' : 'pointer', boxShadow: 'var(--shadow-blue)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', transition: 'all .2s' }}>
                  {generatingI2v ? <><Spinner />Generating motion prompts…</> : `🖼→🎬 Generate ${i2vTool} Motion Prompt`}
                </button>
              </div>

              {/* I2V Results */}
              {generatingI2v && <GeneratingBar message={`Claude is analysing your image and generating ${i2vTool} motion prompt…`} />}

              {i2vPrompts.length > 0 && (
                <div style={{ animation: 'reveal .5s ease both', opacity: 0 }}>
                  <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '.1em', color: 'var(--text3)', textTransform: 'uppercase', marginBottom: '14px' }}>Generated Motion Prompts</div>
                  {i2vPrompts.map((p, i) => (
                    <div key={i} style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '14px', padding: '20px', marginBottom: '12px', boxShadow: 'var(--shadow)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ padding: '3px 10px', borderRadius: '6px', background: 'var(--blue-light)', border: '1px solid rgba(0,87,255,0.15)', fontSize: '11px', color: 'var(--blue)', fontFamily: 'var(--font-mono)' }}>{i2vTool}</span>
                          <span style={{ fontSize: '11px', color: 'var(--text3)', fontFamily: 'var(--font-mono)' }}>{motionDuration} · {motionStyle === 'Custom' ? customMotion : motionStyle}</span>
                        </div>
                        <CopyBtn text={p.prompt} index={i} copiedId={copiedI2v} onCopy={() => { navigator.clipboard.writeText(p.prompt); setCopiedI2v(i); setTimeout(() => setCopiedI2v(null), 2000) }} />
                      </div>
                      {p.note && <div style={{ fontSize: '12px', color: 'var(--text2)', marginBottom: '10px', padding: '8px 12px', background: 'var(--bg3)', borderRadius: '8px', border: '1px solid var(--border)' }}>💡 {p.note}</div>}
                      <div style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: '10px', padding: '14px', fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text2)', lineHeight: 1.8 }}>{p.prompt}</div>
                    </div>
                  ))}
                </div>
              )}

              {!generatingI2v && i2vPrompts.length === 0 && (
                <EmptyState icon="🖼→🎬" title="Upload or paste your generated image" desc="Create your image first in Midjourney, ChatGPT, or any tool — then bring it here to generate a motion prompt that animates it." />
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

// ── Shared components ──

function SceneCard({ scene, index, tool, copiedId, expanded, onToggle, onCopy, onRegenerate }) {
  const [hover, setHover] = useState(false)
  const colors = ['#0057ff', '#00c8b4', '#a050ff', '#ff643c', '#e8a020', '#22cc88', '#ff3c7a', '#5090ff']
  const color = colors[index % colors.length]
  return (
    <div onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{ background: 'var(--bg2)', border: `1px solid ${hover ? 'rgba(0,87,255,0.2)' : 'var(--border)'}`, borderRadius: '14px', overflow: 'hidden', transition: 'all .25s', boxShadow: hover ? 'var(--shadow-hover)' : 'var(--shadow)' }}>
      <div onClick={onToggle} style={{ padding: '16px 20px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '14px' }}>
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
        <span style={{ padding: '3px 9px', borderRadius: '6px', background: `${color}12`, border: `1px solid ${color}30`, fontSize: '10px', color, fontFamily: 'var(--font-mono)', textTransform: 'uppercase' }}>{tool}</span>
        <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }} onClick={e => e.stopPropagation()}>
          <button onClick={onRegenerate} disabled={scene.regenerating}
            style={{ padding: '6px 10px', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: '7px', fontSize: '13px', color: 'var(--text3)', cursor: 'pointer', transition: 'all .2s' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(0,87,255,0.3)'; e.currentTarget.style.color = 'var(--blue)' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text3)' }}>
            {scene.regenerating ? '…' : '↺'}
          </button>
          <button onClick={onCopy}
            style={{ padding: '6px 14px', background: copiedId === index ? 'rgba(34,204,136,0.1)' : 'var(--blue-light)', border: `1px solid ${copiedId === index ? 'rgba(34,204,136,0.3)' : 'rgba(0,87,255,0.2)'}`, borderRadius: '7px', fontSize: '11px', fontWeight: 700, color: copiedId === index ? '#22cc88' : 'var(--blue)', cursor: 'pointer', fontFamily: 'var(--font-ui)', transition: 'all .2s' }}>
            {copiedId === index ? '✓' : 'Copy'}
          </button>
        </div>
        <span style={{ color: 'var(--text3)', fontSize: '12px', flexShrink: 0 }}>{expanded ? '▲' : '▼'}</span>
      </div>
      {expanded && (
        <div style={{ borderTop: '1px solid var(--border)', padding: '16px 20px', animation: 'reveal .3s ease both', opacity: 0 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '14px' }}>
            <div>
              <div style={{ fontSize: '10px', fontFamily: 'var(--font-mono)', letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--text3)', marginBottom: '6px' }}>Scene Description</div>
              <div style={{ fontSize: '12px', color: 'var(--text2)', lineHeight: 1.65 }}>{scene.description}</div>
            </div>
            <div>
              <div style={{ fontSize: '10px', fontFamily: 'var(--font-mono)', letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--text3)', marginBottom: '6px' }}>Visual Direction</div>
              <div style={{ fontSize: '12px', color: 'var(--text2)', lineHeight: 1.65 }}>{scene.visual}</div>
            </div>
          </div>
          <div style={{ fontSize: '10px', fontFamily: 'var(--font-mono)', letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--text3)', marginBottom: '6px' }}>{tool} Prompt</div>
          <div style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: '10px', padding: '14px', fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text2)', lineHeight: 1.8 }}>
            {scene.regenerating ? <span style={{ color: 'var(--blue)', display: 'flex', alignItems: 'center', gap: '8px' }}><Spinner small />Regenerating…</span> : scene.prompt}
          </div>
        </div>
      )}
    </div>
  )
}

function ShotList({ scenes, copiedAll, onCopy }) {
  return (
    <div style={{ marginTop: '20px', padding: '18px 20px', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '14px', boxShadow: 'var(--shadow)' }}>
      <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text)', marginBottom: '4px' }}>📋 Full Shot List</div>
      <div style={{ fontSize: '12px', color: 'var(--text3)', marginBottom: '14px' }}>All {scenes.length} scene prompts ready to share</div>
      <div style={{ background: 'var(--bg3)', borderRadius: '10px', padding: '14px', fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text2)', lineHeight: 1.8, maxHeight: '200px', overflowY: 'auto', border: '1px solid var(--border)' }}>
        {scenes.map((s, i) => (
          <div key={i} style={{ marginBottom: i < scenes.length - 1 ? '14px' : 0 }}>
            <div style={{ color: 'var(--blue)', fontWeight: 500, marginBottom: '3px' }}>SCENE {s.scene} — {s.title} · {s.duration}</div>
            <div style={{ color: 'var(--text2)' }}>{s.prompt}</div>
            {i < scenes.length - 1 && <div style={{ borderTop: '1px solid var(--border)', marginTop: '10px' }} />}
          </div>
        ))}
      </div>
      <button onClick={onCopy} style={{ marginTop: '12px', width: '100%', padding: '10px', background: copiedAll ? 'rgba(34,204,136,0.1)' : 'var(--blue)', color: copiedAll ? '#22cc88' : '#fff', border: copiedAll ? '1px solid rgba(34,204,136,0.3)' : 'none', borderRadius: '9px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-ui)', letterSpacing: '.04em', textTransform: 'uppercase', boxShadow: copiedAll ? 'none' : 'var(--shadow-blue)', transition: 'all .2s' }}>
        {copiedAll ? '✓ Copied!' : 'Copy Full Shot List'}
      </button>
    </div>
  )
}

function CopyBtn({ text, index, copiedId, onCopy }) {
  return (
    <button onClick={onCopy}
      style={{ padding: '6px 14px', background: copiedId === index ? 'rgba(34,204,136,0.1)' : 'var(--blue-light)', border: `1px solid ${copiedId === index ? 'rgba(34,204,136,0.3)' : 'rgba(0,87,255,0.2)'}`, borderRadius: '7px', fontSize: '11px', fontWeight: 700, color: copiedId === index ? '#22cc88' : 'var(--blue)', cursor: 'pointer', fontFamily: 'var(--font-ui)', transition: 'all .2s' }}>
      {copiedId === index ? '✓ Copied' : 'Copy'}
    </button>
  )
}

function GeneratingBar({ message }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px 20px', background: 'var(--blue-light)', border: '1px solid rgba(0,87,255,0.2)', borderRadius: '12px', marginBottom: '20px', animation: 'reveal .3s ease both' }}>
      <Spinner />
      <div>
        <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--blue)' }}>Claude is working…</div>
        <div style={{ fontSize: '11px', color: 'var(--text3)', marginTop: '2px', fontFamily: 'var(--font-mono)' }}>{message}</div>
      </div>
    </div>
  )
}

function EmptyState({ icon, title, desc }) {
  return (
    <div style={{ textAlign: 'center', padding: '60px 40px', background: 'var(--bg2)', border: '1.5px dashed rgba(0,87,255,0.15)', borderRadius: '16px', animation: 'reveal .5s .1s ease both', opacity: 0 }}>
      <div style={{ fontSize: '40px', marginBottom: '14px' }}>{icon}</div>
      <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text)', marginBottom: '8px' }}>{title}</div>
      <div style={{ fontSize: '13px', color: 'var(--text3)', maxWidth: '400px', margin: '0 auto', lineHeight: 1.7 }}>{desc}</div>
    </div>
  )
}

function Label({ children }) {
  return <div style={{ fontSize: '10px', fontFamily: 'var(--font-mono)', letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--text3)', marginBottom: '8px', fontWeight: 500 }}>{children}</div>
}

function CtxTag({ color, children }) {
  const colors = { blue: { bg: 'var(--blue-light)', border: 'rgba(0,87,255,0.25)', text: 'var(--blue)' }, teal: { bg: 'rgba(0,200,180,0.06)', border: 'rgba(0,200,180,0.25)', text: '#00c8b4' } }
  const c = colors[color]
  return <span style={{ padding: '5px 12px', borderRadius: '20px', fontSize: '11px', fontFamily: 'var(--font-mono)', border: `1px solid ${c.border}`, background: c.bg, color: c.text }}>{children}</span>
}

function Spinner({ small }) {
  return <div style={{ width: small ? '10px' : '14px', height: small ? '10px' : '14px', border: '2px solid rgba(0,87,255,0.2)', borderTopColor: 'var(--blue)', borderRadius: '50%', animation: 'spin .7s linear infinite', flexShrink: 0 }} />
}

function LoadingScreen() {
  return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', fontFamily: 'var(--font-mono)', fontSize: '13px', color: 'var(--text3)' }}>Loading…</div>
}
