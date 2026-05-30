'use client'
import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useParams, useRouter } from 'next/navigation'
import Sidebar from '@/components/Sidebar'

const VIDEO_TOOLS = ['Kling', 'Seedance', 'Runway', 'Google VEO', 'Grok', 'Minimax', 'Sora', 'Wan']
const IMAGE_TOOLS = ['ChatGPT', 'Midjourney', 'Nano Banana', 'Flux', 'Adobe Firefly', 'Recraft', 'Higgsfield', 'Seeddream']
const CAMERA_TYPES = ['Cinematic 35mm', 'Drone aerial', 'Handheld', 'Wide angle', 'Macro close-up', 'Telephoto', 'GoPro POV', 'Steadicam', 'Anamorphic', 'DSLR shallow depth']
const IMAGE_RATIOS = ['16:9', '9:16', '1:1', '4:5', '4:3', '2.35:1 (Cinematic)', '3:2']
const THEMES = ['Dark & moody', 'Warm & golden', 'Clean & minimal', 'Gritty & raw', 'Luxury editorial', 'Bright & vibrant', 'Neon & futuristic', 'Vintage & film', 'Nature & organic', 'Urban street']
const GRADINGS = ['Cinematic teal & orange', 'Desaturated & muted', 'High contrast B&W', 'Warm golden hour', 'Cool blue grade', 'Natural & clean', 'Bleach bypass', 'Vintage film grain', 'HDR vivid', 'Soft pastel']
const MOTION_STYLES = ['Slow zoom in', 'Slow zoom out', 'Pan left to right', 'Pan right to left', 'Tilt up', 'Tilt down', 'Orbit around subject', 'Dolly forward', 'Dolly back', 'Handheld shake', 'Static locked off', 'Drone rise', 'Whip pan', 'Push in', 'Pull back reveal', 'Custom']

const VIDEO_GENRES = ['Brand campaign', 'Product launch', 'Social media reel', 'TV commercial (TVC)', 'Documentary', 'Music video', 'Fashion film', 'Food & beverage', 'Travel & lifestyle', 'Corporate', 'Short film']
const VIDEO_TONES = ['Inspiring & uplifting', 'Emotional & heartfelt', 'Energetic & fast', 'Luxurious & slow', 'Playful & fun', 'Gritty & raw', 'Mysterious & cinematic', 'Minimal & clean', 'Bold & dramatic']
const VIDEO_DURATIONS = ['15 seconds', '30 seconds', '45 seconds', '60 seconds', '90 seconds', '2 minutes', '3 minutes']

const MODES = [
  { id: 'frames', icon: '🎞', label: 'Script to Frames', desc: 'Per-scene image + video prompts with full visual filters' },
  { id: 'script', icon: '📝', label: 'Script to Video', desc: 'Paste script → Lumen breaks into scenes → video prompts' },
  { id: 'image2video', icon: '🖼→🎬', label: 'Image to Video', desc: 'Upload image → generate motion prompts for any tool' },
  { id: 'generate', icon: '✍', label: 'Generate Script', desc: 'Brief in → full video script out from scratch' },
]

export default function VideoScriptPage() {
  const { id } = useParams()
  const router = useRouter()
  const [project, setProject] = useState(null)
  const [summary, setSummary] = useState(null)
  const [refs, setRefs] = useState([])
  const [loading, setLoading] = useState(true)
  const [mode, setMode] = useState('frames')

  // Frames mode
  const [frameScript, setFrameScript] = useState('')
  const [frameTool, setFrameTool] = useState('Kling')
  const [frameImageTool, setFrameImageTool] = useState('Midjourney')
  const [frameCamera, setFrameCamera] = useState('Cinematic 35mm')
  const [frameRatio, setFrameRatio] = useState('16:9')
  const [frameTheme, setFrameTheme] = useState('Dark & moody')
  const [frameGrading, setFrameGrading] = useState('Cinematic teal & orange')
  const [frames, setFrames] = useState([])
  const [generatingFrames, setGeneratingFrames] = useState(false)
  const [copiedFrameId, setCopiedFrameId] = useState(null)
  const [expandedFrameId, setExpandedFrameId] = useState(null)

  // Script to video mode
  const [script, setScript] = useState('')
  const [tool, setTool] = useState('Kling')
  const [scenes, setScenes] = useState([])
  const [generating, setGenerating] = useState(false)
  const [copiedId, setCopiedId] = useState(null)
  const [copiedAll, setCopiedAll] = useState(false)
  const [expandedId, setExpandedId] = useState(null)

  // Image to video
  const [imageSource, setImageSource] = useState('upload')
  const [uploadedImage, setUploadedImage] = useState(null)
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

  // Generate script
  const [genBrief, setGenBrief] = useState('')
  const [genGenre, setGenGenre] = useState('Brand campaign')
  const [genTone, setGenTone] = useState('Inspiring & uplifting')
  const [genDuration, setGenDuration] = useState('30 seconds')
  const [genScenes, setGenScenes] = useState('5')
  const [generatedScript, setGeneratedScript] = useState('')
  const [generatingScript, setGeneratingScript] = useState(false)
  const [copiedScript, setCopiedScript] = useState(false)

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

  const brandSummary = summary?.summary_text || project?.brands?.summary_text || ''

  // ── Frames mode ──
  async function generateFrames() {
    if (!frameScript.trim()) return
    setGeneratingFrames(true)
    setFrames([])
    try {
      const res = await fetch('/api/videoscript/frames', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          script: frameScript,
          videoTool: frameTool,
          imageTool: frameImageTool,
          camera: frameCamera,
          ratio: frameRatio,
          theme: frameTheme,
          grading: frameGrading,
          brandSummary,
          refs: refs.map(r => ({ url: r.image_url, tag: r.tag })),
          projectName: project?.name,
        }),
      })
      const result = await res.json()
      if (result.frames) setFrames(result.frames)
    } catch (err) {
      console.error(err)
      alert('Generation failed: ' + err.message + '\n\nTip: Make sure your script has enough detail for Lumen to extract scenes.')
    }
    setGeneratingFrames(false)
  }

  // ── Script to video ──
  async function generateScenes() {
    if (!script.trim()) return
    setGenerating(true); setScenes([])
    try {
      const res = await fetch('/api/videoscript/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ script, tool, brandSummary, refs: refs.map(r => ({ url: r.image_url, tag: r.tag })), projectName: project?.name }),
      })
      const result = await res.json()
      if (result.scenes) setScenes(result.scenes)
    } catch (err) { alert('Failed: ' + err.message) }
    setGenerating(false)
  }

  async function regenerateScene(i) {
    const scene = scenes[i]
    setScenes(prev => prev.map((s, idx) => idx === i ? { ...s, regenerating: true } : s))
    try {
      const res = await fetch('/api/videoscript/regenerate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scene: scene.description, sceneNum: scene.scene, tool, brandSummary, refs: refs.map(r => ({ url: r.image_url, tag: r.tag })) }),
      })
      const result = await res.json()
      if (result.prompt) setScenes(prev => prev.map((s, idx) => idx === i ? { ...s, prompt: result.prompt, regenerating: false } : s))
    } catch { setScenes(prev => prev.map((s, idx) => idx === i ? { ...s, regenerating: false } : s)) }
  }

  async function copyAll() {
    const text = scenes.map(s => `SCENE ${s.scene} — ${s.title}\n${s.prompt}`).join('\n\n─────\n\n')
    await navigator.clipboard.writeText(text)
    setCopiedAll(true); setTimeout(() => setCopiedAll(false), 2500)
  }

  // ── Image to video ──
  async function handleImageUpload(e) {
    const file = e.target.files[0]; if (!file) return
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
    setGeneratingI2v(true); setI2vPrompts([])
    try {
      const res = await fetch('/api/videoscript/image2video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrl: activeImage, motionStyle: motionStyle === 'Custom' ? customMotion : motionStyle, duration: motionDuration, mood: motionMood, tool: i2vTool, brandSummary, projectName: project?.name }),
      })
      const result = await res.json()
      if (result.prompts) setI2vPrompts(result.prompts)
    } catch (err) { alert('Failed: ' + err.message) }
    setGeneratingI2v(false)
  }

  // ── Generate script ──
  async function generateScript() {
    if (!genBrief.trim()) return
    setGeneratingScript(true); setGeneratedScript('')
    try {
      const res = await fetch('/api/videoscript/scriptgen', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brief: genBrief, genre: genGenre, tone: genTone, duration: genDuration, scenes: genScenes, brandSummary, projectName: project?.name }),
      })
      const result = await res.json()
      if (result.script) setGeneratedScript(result.script)
    } catch (err) { alert('Failed: ' + err.message) }
    setGeneratingScript(false)
  }

  if (loading) return <LoadingScreen />

  return (
    <div style={{ display: 'flex', height: '100vh', background: 'var(--bg)' }}>
      <Sidebar projectId={id} projectName={project?.name} brandName={project?.brands?.name} campaignType={project?.campaign_type} />
      <main style={{ flex: 1, overflowY: 'auto' }}>
        <div style={{ position: 'sticky', top: 0, zIndex: 10, padding: '16px 32px', background: 'rgba(248,248,252,0.9)', backdropFilter: 'blur(20px)', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', animation: 'slide-down .5s ease' }}>
          <div>
            <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text)' }}>Video</div>
            <div style={{ fontSize: '11px', color: 'var(--text3)', fontFamily: 'var(--font-mono)', marginTop: '2px' }}>{project?.name} · Frames · Script · Image to Video · Script Generator</div>
          </div>
          {mode === 'script' && scenes.length > 0 && (
            <button onClick={copyAll} style={{ padding: '9px 18px', background: copiedAll ? 'rgba(34,204,136,0.1)' : 'var(--blue)', color: copiedAll ? '#22cc88' : '#fff', border: copiedAll ? '1px solid rgba(34,204,136,0.3)' : 'none', borderRadius: '9px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-ui)', letterSpacing: '.04em', textTransform: 'uppercase', boxShadow: copiedAll ? 'none' : 'var(--shadow-blue)', transition: 'all .2s' }}>
              {copiedAll ? '✓ Copied!' : `Copy All ${scenes.length} Scenes`}
            </button>
          )}
        </div>

        <div style={{ padding: '28px 32px' }}>
          {/* Mode tabs */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '10px', marginBottom: '24px', animation: 'reveal .5s ease both', opacity: 0 }}>
            {MODES.map(m => (
              <button key={m.id} onClick={() => setMode(m.id)}
                style={{ padding: '14px 16px', borderRadius: '14px', border: `1.5px solid ${mode === m.id ? 'rgba(0,87,255,0.35)' : 'var(--border)'}`, background: mode === m.id ? 'var(--blue-light)' : 'var(--bg2)', cursor: 'pointer', textAlign: 'left', transition: 'all .2s', boxShadow: mode === m.id ? 'var(--shadow-blue)' : 'var(--shadow)', fontFamily: 'var(--font-ui)' }}>
                <div style={{ fontSize: '20px', marginBottom: '6px' }}>{m.icon}</div>
                <div style={{ fontSize: '13px', fontWeight: 700, color: mode === m.id ? 'var(--blue)' : 'var(--text)', marginBottom: '3px' }}>{m.label}</div>
                <div style={{ fontSize: '11px', color: 'var(--text3)', lineHeight: 1.4 }}>{m.desc}</div>
              </button>
            ))}
          </div>

          {/* ── FRAMES MODE ── */}
          {mode === 'frames' && (
            <div style={{ animation: 'reveal .5s ease both', opacity: 0 }}>
              <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '16px', padding: '24px', marginBottom: '24px', boxShadow: 'var(--shadow)' }}>

                <ContextBar brandSummary={brandSummary} refs={refs} />

                {/* Script input */}
                <Label>Paste Video Script</Label>
                <textarea value={frameScript} onChange={e => setFrameScript(e.target.value)}
                  placeholder="Paste your video script here — any format works. Lumen will extract each scene and generate both an image prompt and a video prompt for it."
                  style={{ width: '100%', minHeight: '140px', padding: '14px', background: 'var(--bg3)', border: '1.5px solid var(--border)', borderRadius: '12px', color: 'var(--text)', fontFamily: 'var(--font-ui)', fontSize: '13px', lineHeight: 1.75, resize: 'vertical', outline: 'none', transition: 'border-color .2s', marginBottom: '20px' }}
                  onFocus={e => e.target.style.borderColor = 'rgba(0,87,255,0.4)'}
                  onBlur={e => e.target.style.borderColor = 'var(--border)'} />

                {/* Filters grid */}
                <div style={{ background: 'var(--bg3)', borderRadius: '12px', padding: '16px 18px', border: '1px solid var(--border)', marginBottom: '18px' }}>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: '14px' }}>Visual Filters</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                      <Label>Image Tool</Label>
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                        {IMAGE_TOOLS.map(t => (
                          <button key={t} onClick={() => setFrameImageTool(t)}
                            style={{ padding: '5px 10px', borderRadius: '7px', border: `1px solid ${frameImageTool === t ? 'rgba(0,87,255,0.4)' : 'var(--border)'}`, background: frameImageTool === t ? 'var(--blue-light)' : 'var(--bg2)', color: frameImageTool === t ? 'var(--blue)' : 'var(--text2)', fontFamily: 'var(--font-ui)', fontSize: '11px', fontWeight: 600, cursor: 'pointer', transition: 'all .2s' }}>
                            {t}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <Label>Video Tool</Label>
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                        {VIDEO_TOOLS.map(t => (
                          <button key={t} onClick={() => setFrameTool(t)}
                            style={{ padding: '5px 10px', borderRadius: '7px', border: `1px solid ${frameTool === t ? 'rgba(0,87,255,0.4)' : 'var(--border)'}`, background: frameTool === t ? 'var(--blue-light)' : 'var(--bg2)', color: frameTool === t ? 'var(--blue)' : 'var(--text2)', fontFamily: 'var(--font-ui)', fontSize: '11px', fontWeight: 600, cursor: 'pointer', transition: 'all .2s' }}>
                            {t}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <Label>Camera Type</Label>
                      <select value={frameCamera} onChange={e => setFrameCamera(e.target.value)} style={selectStyle}>
                        {CAMERA_TYPES.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                    <div>
                      <Label>Image Ratio</Label>
                      <select value={frameRatio} onChange={e => setFrameRatio(e.target.value)} style={selectStyle}>
                        {IMAGE_RATIOS.map(r => <option key={r} value={r}>{r}</option>)}
                      </select>
                    </div>
                    <div>
                      <Label>Theme</Label>
                      <select value={frameTheme} onChange={e => setFrameTheme(e.target.value)} style={selectStyle}>
                        {THEMES.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                    <div>
                      <Label>Color Grading</Label>
                      <select value={frameGrading} onChange={e => setFrameGrading(e.target.value)} style={selectStyle}>
                        {GRADINGS.map(g => <option key={g} value={g}>{g}</option>)}
                      </select>
                    </div>
                  </div>
                </div>

                <button onClick={generateFrames} disabled={generatingFrames || !frameScript.trim()}
                  style={{ width: '100%', padding: '12px', background: generatingFrames ? 'rgba(0,87,255,0.5)' : 'var(--blue)', color: '#fff', border: 'none', borderRadius: '10px', fontFamily: 'var(--font-ui)', fontSize: '13px', fontWeight: 700, letterSpacing: '.05em', textTransform: 'uppercase', cursor: generatingFrames ? 'not-allowed' : 'pointer', boxShadow: 'var(--shadow-blue)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                  {generatingFrames ? <><Spinner />Generating frame prompts…</> : `🎞 Generate Image + Video Prompts for All Scenes`}
                </button>
              </div>

              {generatingFrames && <GeneratingBar message="Lumen is extracting scenes and generating image + video prompts with your visual filters…" />}

              {frames.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <span style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '.1em', color: 'var(--text3)', textTransform: 'uppercase' }}>{frames.length} Frames Generated</span>
                      <FilterBadge label={frameImageTool} />
                      <FilterBadge label={frameTool} color="teal" />
                      <FilterBadge label={frameTheme} color="purple" />
                    </div>
                    <button onClick={() => { setFrames([]); setFrameScript('') }} style={{ padding: '6px 12px', background: 'transparent', border: '1px solid var(--border2)', borderRadius: '8px', fontSize: '11px', color: 'var(--text3)', cursor: 'pointer', fontFamily: 'var(--font-ui)' }}>Start Over</button>
                  </div>
                  {frames.map((frame, i) => <FrameCard key={i} frame={frame} index={i} expanded={expandedFrameId === i} onToggle={() => setExpandedFrameId(expandedFrameId === i ? null : i)} copiedId={copiedFrameId} onCopy={async (text) => { await navigator.clipboard.writeText(text); setCopiedFrameId(`${i}-${text.slice(0,5)}`); setTimeout(() => setCopiedFrameId(null), 2000) }} />)}
                </div>
              )}

              {!generatingFrames && frames.length === 0 && <EmptyState icon="🎞" title="Paste your script above" desc="Lumen extracts each scene and generates both an image prompt AND a video prompt — with camera type, ratio, theme, and grading applied to every frame." />}
            </div>
          )}

          {/* ── SCRIPT TO VIDEO ── */}
          {mode === 'script' && (
            <div style={{ animation: 'reveal .5s ease both', opacity: 0 }}>
              <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '16px', padding: '24px', marginBottom: '24px', boxShadow: 'var(--shadow)' }}>
                <ContextBar brandSummary={brandSummary} refs={refs} />
                <Label>Video Tool</Label>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '18px' }}>
                  {VIDEO_TOOLS.map(t => <ToolBtn key={t} t={t} active={tool === t} onClick={() => setTool(t)} />)}
                </div>
                <Label>Paste Video Script</Label>
                <textarea value={script} onChange={e => setScript(e.target.value)} placeholder="Paste your video script — any format works." style={{ width: '100%', minHeight: '160px', padding: '14px', background: 'var(--bg3)', border: '1.5px solid var(--border)', borderRadius: '12px', color: 'var(--text)', fontFamily: 'var(--font-ui)', fontSize: '13px', lineHeight: 1.75, resize: 'vertical', outline: 'none', transition: 'border-color .2s', marginBottom: '16px' }} onFocus={e => e.target.style.borderColor = 'rgba(0,87,255,0.4)'} onBlur={e => e.target.style.borderColor = 'var(--border)'} />
                <button onClick={generateScenes} disabled={generating || !script.trim()} style={{ width: '100%', padding: '12px', background: generating ? 'rgba(0,87,255,0.5)' : 'var(--blue)', color: '#fff', border: 'none', borderRadius: '10px', fontFamily: 'var(--font-ui)', fontSize: '13px', fontWeight: 700, letterSpacing: '.05em', textTransform: 'uppercase', cursor: generating ? 'not-allowed' : 'pointer', boxShadow: 'var(--shadow-blue)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                  {generating ? <><Spinner />Generating…</> : `🎬 Generate ${tool} Prompts`}
                </button>
              </div>
              {generating && <GeneratingBar message={`Lumen is breaking script into scenes and generating ${tool} prompts…`} />}
              {scenes.length > 0 && (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                    <div style={{ display: 'flex', gap: '8px' }}><span style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '.1em', color: 'var(--text3)', textTransform: 'uppercase' }}>{scenes.length} Scenes</span><FilterBadge label={tool} /></div>
                    <button onClick={() => { setScenes([]); setScript('') }} style={{ padding: '6px 12px', background: 'transparent', border: '1px solid var(--border2)', borderRadius: '8px', fontSize: '11px', color: 'var(--text3)', cursor: 'pointer', fontFamily: 'var(--font-ui)' }}>Start Over</button>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {scenes.map((scene, i) => <SceneCard key={i} scene={scene} index={i} tool={tool} copiedId={copiedId} expanded={expandedId === i} onToggle={() => setExpandedId(expandedId === i ? null : i)} onCopy={async () => { await navigator.clipboard.writeText(scene.prompt); setCopiedId(i); setTimeout(() => setCopiedId(null), 2000) }} onRegenerate={() => regenerateScene(i)} />)}
                  </div>
                  <ShotList scenes={scenes} copiedAll={copiedAll} onCopy={copyAll} />
                </>
              )}
              {!generating && scenes.length === 0 && <EmptyState icon="📝" title="Paste your video script above" desc="Lumen reads the full script, breaks it into scenes, and generates a tool-specific prompt for each frame." />}
            </div>
          )}

          {/* ── IMAGE TO VIDEO ── */}
          {mode === 'image2video' && (
            <div style={{ animation: 'reveal .5s ease both', opacity: 0 }}>
              <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '16px', padding: '24px', marginBottom: '20px', boxShadow: 'var(--shadow)' }}>
                <Label>Source Image</Label>
                <div style={{ display: 'flex', gap: '4px', marginBottom: '16px', background: 'var(--bg3)', borderRadius: '10px', padding: '4px', border: '1px solid var(--border)' }}>
                  {[{ id: 'upload', label: '↑ Upload' }, { id: 'url', label: '🔗 Paste URL' }, { id: 'refs', label: `🎨 References${refs.length > 0 ? ` (${refs.length})` : ''}` }].map(tab => (
                    <button key={tab.id} onClick={() => setImageSource(tab.id)} style={{ flex: 1, padding: '8px', borderRadius: '7px', fontSize: '11px', fontWeight: 700, cursor: 'pointer', transition: 'all .2s', color: imageSource === tab.id ? 'var(--blue)' : 'var(--text3)', background: imageSource === tab.id ? 'var(--bg2)' : 'transparent', border: 'none', fontFamily: 'var(--font-ui)', letterSpacing: '.04em', textTransform: 'uppercase', boxShadow: imageSource === tab.id ? 'var(--shadow)' : 'none' }}>{tab.label}</button>
                  ))}
                </div>
                {imageSource === 'upload' && (
                  <div style={{ marginBottom: '16px' }}>
                    <div onClick={() => imageUploadRef.current?.click()} style={{ border: `1.5px dashed rgba(0,87,255,${uploadedImage ? '.4' : '.2'})`, borderRadius: '12px', padding: '24px', textAlign: 'center', cursor: 'pointer', background: uploadedImage ? 'rgba(0,87,255,0.02)' : 'var(--bg3)', transition: 'all .3s' }} onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(0,87,255,0.5)'} onMouseLeave={e => e.currentTarget.style.borderColor = uploadedImage ? 'rgba(0,87,255,0.4)' : 'rgba(0,87,255,0.2)'}>
                      {uploadedImage ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', justifyContent: 'center' }}>
                          <img src={uploadedImage.url} alt="" style={{ width: '70px', height: '70px', objectFit: 'cover', borderRadius: '10px' }} />
                          <div style={{ textAlign: 'left' }}>
                            <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)', marginBottom: '3px' }}>{uploadedImage.name}</div>
                            <div style={{ fontSize: '11px', color: 'var(--blue)', fontFamily: 'var(--font-mono)' }}>✓ Ready to animate · Click to replace</div>
                          </div>
                        </div>
                      ) : <><div style={{ fontSize: '28px', marginBottom: '8px' }}>{uploadingImage ? '…' : '🖼'}</div><div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)' }}>{uploadingImage ? 'Uploading…' : 'Upload your generated image'}</div><div style={{ fontSize: '11px', color: 'var(--text3)', marginTop: '3px' }}>JPG, PNG, WEBP</div></>}
                    </div>
                    <input ref={imageUploadRef} type="file" accept="image/*" onChange={handleImageUpload} style={{ display: 'none' }} />
                  </div>
                )}
                {imageSource === 'url' && (
                  <div style={{ marginBottom: '16px' }}>
                    <input value={imageUrl} onChange={e => setImageUrl(e.target.value)} placeholder="Paste image URL from Midjourney, ChatGPT, anywhere…" style={{ width: '100%', padding: '11px 14px', background: 'var(--bg3)', border: '1.5px solid var(--border)', borderRadius: '10px', color: 'var(--text)', fontFamily: 'var(--font-ui)', fontSize: '13px', outline: 'none', transition: 'border-color .2s', marginBottom: '10px' }} onFocus={e => e.target.style.borderColor = 'rgba(0,87,255,0.4)'} onBlur={e => e.target.style.borderColor = 'var(--border)'} />
                    {imageUrl.trim() && <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 14px', background: 'var(--bg3)', borderRadius: '10px', border: '1px solid var(--border)' }}><img src={imageUrl.trim()} alt="" style={{ width: '50px', height: '50px', objectFit: 'cover', borderRadius: '7px' }} onError={e => e.target.style.display = 'none'} /><div style={{ fontSize: '12px', color: 'var(--text2)' }}>Preview loaded ✓</div></div>}
                  </div>
                )}
                {imageSource === 'refs' && (
                  <div style={{ marginBottom: '16px' }}>
                    {refs.length === 0 ? <div style={{ padding: '20px', background: 'var(--bg3)', borderRadius: '10px', textAlign: 'center', fontSize: '13px', color: 'var(--text3)' }}>No references yet — <a href={`/project/${id}/references`} style={{ color: 'var(--blue)', fontWeight: 600 }}>add some first</a></div> : (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '8px' }}>
                        {refs.map(ref => (
                          <div key={ref.id} onClick={() => setSelectedRef(ref)} style={{ borderRadius: '10px', overflow: 'hidden', border: `2px solid ${selectedRef?.id === ref.id ? 'var(--blue)' : 'var(--border)'}`, cursor: 'pointer', transition: 'all .2s', position: 'relative', aspectRatio: '1', background: 'var(--bg3)' }}>
                            <img src={ref.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => e.target.style.display = 'none'} />
                            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '3px 6px', background: 'rgba(0,0,0,0.6)', fontSize: '9px', color: '#fff', fontFamily: 'var(--font-mono)', textTransform: 'uppercase' }}>{ref.tag}</div>
                            {selectedRef?.id === ref.id && <div style={{ position: 'absolute', top: '5px', right: '5px', width: '18px', height: '18px', borderRadius: '50%', background: 'var(--blue)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', color: '#fff' }}>✓</div>}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                <div style={{ height: '1px', background: 'var(--border)', margin: '4px 0 18px' }} />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '16px' }}>
                  <div>
                    <Label>Motion Style</Label>
                    <select value={motionStyle} onChange={e => setMotionStyle(e.target.value)} style={selectStyle}>{MOTION_STYLES.map(s => <option key={s} value={s}>{s}</option>)}</select>
                    {motionStyle === 'Custom' && <input value={customMotion} onChange={e => setCustomMotion(e.target.value)} placeholder="Describe motion…" style={{ ...selectStyle, marginTop: '8px' }} onFocus={e => e.target.style.borderColor = 'rgba(0,87,255,0.4)'} onBlur={e => e.target.style.borderColor = 'var(--border)'} />}
                  </div>
                  <div>
                    <Label>Duration</Label>
                    <select value={motionDuration} onChange={e => setMotionDuration(e.target.value)} style={selectStyle}>{['2s','3s','4s','5s','6s','8s','10s'].map(d => <option key={d} value={d}>{d}</option>)}</select>
                  </div>
                </div>
                <div style={{ marginBottom: '16px' }}>
                  <Label>Mood (optional)</Label>
                  <input value={motionMood} onChange={e => setMotionMood(e.target.value)} placeholder="e.g. Cinematic, dreamy, tense, energetic…" style={selectStyle} onFocus={e => e.target.style.borderColor = 'rgba(0,87,255,0.4)'} onBlur={e => e.target.style.borderColor = 'var(--border)'} />
                </div>
                <Label>Video Tool</Label>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '20px' }}>
                  {VIDEO_TOOLS.map(t => <ToolBtn key={t} t={t} active={i2vTool === t} onClick={() => setI2vTool(t)} />)}
                </div>
                <button onClick={generateI2VPrompts} disabled={generatingI2v || !getActiveImage()} style={{ width: '100%', padding: '12px', background: generatingI2v || !getActiveImage() ? 'rgba(0,87,255,0.4)' : 'var(--blue)', color: '#fff', border: 'none', borderRadius: '10px', fontFamily: 'var(--font-ui)', fontSize: '13px', fontWeight: 700, letterSpacing: '.05em', textTransform: 'uppercase', cursor: generatingI2v || !getActiveImage() ? 'not-allowed' : 'pointer', boxShadow: 'var(--shadow-blue)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                  {generatingI2v ? <><Spinner />Generating…</> : `🖼→🎬 Generate ${i2vTool} Motion Prompt`}
                </button>
              </div>
              {generatingI2v && <GeneratingBar message="Lumen is analysing your image and generating motion prompts…" />}
              {i2vPrompts.length > 0 && i2vPrompts.map((p, i) => (
                <div key={i} style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '14px', padding: '20px', marginBottom: '12px', boxShadow: 'var(--shadow)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                    <div style={{ display: 'flex', gap: '8px' }}><FilterBadge label={i2vTool} /><span style={{ fontSize: '11px', color: 'var(--text3)', fontFamily: 'var(--font-mono)' }}>{motionDuration} · {motionStyle}</span></div>
                    <SmallCopyBtn text={p.prompt} />
                  </div>
                  {p.note && <div style={{ fontSize: '12px', color: 'var(--text2)', marginBottom: '10px', padding: '8px 12px', background: 'var(--bg3)', borderRadius: '8px' }}>💡 {p.note}</div>}
                  <div style={{ background: 'var(--bg3)', borderRadius: '10px', padding: '14px', fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text2)', lineHeight: 1.8 }}>{p.prompt}</div>
                </div>
              ))}
              {!generatingI2v && i2vPrompts.length === 0 && <EmptyState icon="🖼→🎬" title="Upload or paste your generated image" desc="Create your image first in Midjourney, ChatGPT, or any tool — then bring it here to animate it." />}
            </div>
          )}

          {/* ── GENERATE SCRIPT ── */}
          {mode === 'generate' && (
            <div style={{ animation: 'reveal .5s ease both', opacity: 0 }}>
              <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '16px', padding: '24px', marginBottom: '20px', boxShadow: 'var(--shadow)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '18px' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'var(--blue-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>✍</div>
                  <div>
                    <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text)' }}>Generate Video Script from Scratch</div>
                    <div style={{ fontSize: '12px', color: 'var(--text3)' }}>Brief in → full scene-by-scene script out — ready to use in any other tab</div>
                  </div>
                </div>

                <ContextBar brandSummary={brandSummary} refs={refs} />

                <div style={{ marginBottom: '16px' }}>
                  <Label>Campaign Brief / Product Description *</Label>
                  <textarea value={genBrief} onChange={e => setGenBrief(e.target.value)}
                    placeholder="Describe what this video is about…&#10;&#10;e.g. New Nike running shoe launch for women 25-35. Hero is a woman who runs at 5am before the city wakes up. The shoe is the only constant across all scenes. No dialogue. Product in every frame."
                    style={{ width: '100%', minHeight: '120px', padding: '14px', background: 'var(--bg3)', border: '1.5px solid var(--border)', borderRadius: '12px', color: 'var(--text)', fontFamily: 'var(--font-ui)', fontSize: '13px', lineHeight: 1.75, resize: 'vertical', outline: 'none', transition: 'border-color .2s' }}
                    onFocus={e => e.target.style.borderColor = 'rgba(0,87,255,0.4)'}
                    onBlur={e => e.target.style.borderColor = 'var(--border)'} />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '16px' }}>
                  <div>
                    <Label>Video Genre</Label>
                    <select value={genGenre} onChange={e => setGenGenre(e.target.value)} style={selectStyle}>{VIDEO_GENRES.map(g => <option key={g} value={g}>{g}</option>)}</select>
                  </div>
                  <div>
                    <Label>Tone</Label>
                    <select value={genTone} onChange={e => setGenTone(e.target.value)} style={selectStyle}>{VIDEO_TONES.map(t => <option key={t} value={t}>{t}</option>)}</select>
                  </div>
                  <div>
                    <Label>Video Duration</Label>
                    <select value={genDuration} onChange={e => setGenDuration(e.target.value)} style={selectStyle}>{VIDEO_DURATIONS.map(d => <option key={d} value={d}>{d}</option>)}</select>
                  </div>
                  <div>
                    <Label>Number of Scenes</Label>
                    <select value={genScenes} onChange={e => setGenScenes(e.target.value)} style={selectStyle}>{['3','4','5','6','7','8','10'].map(n => <option key={n} value={n}>{n} scenes</option>)}</select>
                  </div>
                </div>

                <button onClick={generateScript} disabled={generatingScript || !genBrief.trim()}
                  style={{ width: '100%', padding: '12px', background: generatingScript ? 'rgba(0,87,255,0.5)' : 'var(--blue)', color: '#fff', border: 'none', borderRadius: '10px', fontFamily: 'var(--font-ui)', fontSize: '13px', fontWeight: 700, letterSpacing: '.05em', textTransform: 'uppercase', cursor: generatingScript ? 'not-allowed' : 'pointer', boxShadow: 'var(--shadow-blue)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                  {generatingScript ? <><Spinner />Writing script…</> : '✍ Generate Video Script'}
                </button>
              </div>

              {generatingScript && <GeneratingBar message="Lumen is writing your video script with brand context and scene-by-scene direction…" />}

              {generatedScript && (
                <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '16px', padding: '24px', boxShadow: 'var(--shadow)', animation: 'reveal .5s ease both', opacity: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text)', marginBottom: '2px' }}>Generated Script</div>
                      <div style={{ fontSize: '11px', color: 'var(--text3)', fontFamily: 'var(--font-mono)' }}>{genGenre} · {genTone} · {genDuration} · {genScenes} scenes</div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <SmallCopyBtn text={generatedScript} label={copiedScript ? '✓ Copied!' : 'Copy Script'} onCopy={() => { navigator.clipboard.writeText(generatedScript); setCopiedScript(true); setTimeout(() => setCopiedScript(false), 2000) }} />
                      <button onClick={() => { setMode('frames'); setFrameScript(generatedScript) }}
                        style={{ padding: '8px 16px', background: 'var(--blue)', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-ui)', letterSpacing: '.04em', textTransform: 'uppercase', boxShadow: 'var(--shadow-blue)' }}>
                        → Use in Frames
                      </button>
                      <button onClick={() => { setMode('script'); setScript(generatedScript) }}
                        style={{ padding: '8px 16px', background: 'var(--blue-light)', border: '1px solid rgba(0,87,255,0.2)', borderRadius: '8px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', color: 'var(--blue)', fontFamily: 'var(--font-ui)', letterSpacing: '.04em', textTransform: 'uppercase' }}>
                        → Use in Video
                      </button>
                    </div>
                  </div>
                  <div style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: '12px', padding: '20px', fontFamily: 'var(--font-ui)', fontSize: '13px', color: 'var(--text2)', lineHeight: 1.85, whiteSpace: 'pre-wrap', maxHeight: '500px', overflowY: 'auto' }}>
                    {generatedScript}
                  </div>
                  <div style={{ marginTop: '12px', padding: '12px 14px', background: 'var(--blue-light)', border: '1px solid rgba(0,87,255,0.15)', borderRadius: '10px', fontSize: '12px', color: 'var(--blue)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>💡</span>
                    <span>Script ready — hit <strong>→ Use in Frames</strong> to generate image + video prompts for every scene, or <strong>→ Use in Video</strong> for video-only prompts</span>
                  </div>
                </div>
              )}

              {!generatingScript && !generatedScript && <EmptyState icon="✍" title="Describe your video campaign" desc="Fill in the brief, choose genre, tone, duration and number of scenes. Lumen writes a complete scene-by-scene script with visual direction — then use it directly in the Frames or Script to Video tabs." />}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

// ── Frame Card ──
function FrameCard({ frame, index, expanded, onToggle, copiedId, onCopy }) {
  const [hover, setHover] = useState(false)
  const colors = ['#0057ff', '#00c8b4', '#a050ff', '#ff643c', '#e8a020', '#22cc88', '#ff3c7a', '#5090ff']
  const color = colors[index % colors.length]
  return (
    <div onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{ background: 'var(--bg2)', border: `1px solid ${hover ? 'rgba(0,87,255,0.2)' : 'var(--border)'}`, borderRadius: '14px', overflow: 'hidden', transition: 'all .25s', boxShadow: hover ? 'var(--shadow-hover)' : 'var(--shadow)' }}>
      <div onClick={onToggle} style={{ padding: '16px 20px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '14px' }}>
        <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: `${color}18`, border: `1px solid ${color}33`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <span style={{ fontSize: '12px', fontWeight: 800, color, fontFamily: 'var(--font-mono)' }}>{String(frame.scene).padStart(2, '0')}</span>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text)', marginBottom: '2px' }}>{frame.title}</div>
          <div style={{ fontSize: '11px', color: 'var(--text3)', fontFamily: 'var(--font-mono)' }}>{frame.duration} · {frame.camera}</div>
        </div>
        <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
          <span style={{ padding: '3px 8px', borderRadius: '5px', background: 'var(--blue-light)', border: '1px solid rgba(0,87,255,0.15)', fontSize: '10px', color: 'var(--blue)', fontFamily: 'var(--font-mono)' }}>IMG</span>
          <span style={{ padding: '3px 8px', borderRadius: '5px', background: 'rgba(0,200,180,0.08)', border: '1px solid rgba(0,200,180,0.2)', fontSize: '10px', color: '#00c8b4', fontFamily: 'var(--font-mono)' }}>VID</span>
        </div>
        <span style={{ color: 'var(--text3)', fontSize: '12px' }}>{expanded ? '▲' : '▼'}</span>
      </div>
      {expanded && (
        <div style={{ borderTop: '1px solid var(--border)', padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: '14px', animation: 'reveal .3s ease both', opacity: 0 }}>
          <div style={{ fontSize: '12px', color: 'var(--text2)', lineHeight: 1.65, padding: '10px 14px', background: 'var(--bg3)', borderRadius: '8px', border: '1px solid var(--border)' }}>
            <span style={{ fontSize: '10px', color: 'var(--text3)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '.08em', display: 'block', marginBottom: '5px' }}>Scene Description</span>
            {frame.description}
          </div>
          {/* Image prompt */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '10px', fontFamily: 'var(--font-mono)', letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--text3)' }}>Image Prompt</span>
                <span style={{ padding: '2px 7px', borderRadius: '5px', background: 'var(--blue-light)', border: '1px solid rgba(0,87,255,0.15)', fontSize: '10px', color: 'var(--blue)', fontFamily: 'var(--font-mono)' }}>Ready to paste</span>
              </div>
              <SmallCopyBtn text={frame.imagePrompt} />
            </div>
            <div style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: '10px', padding: '14px', fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text2)', lineHeight: 1.8 }}>{frame.imagePrompt}</div>
          </div>
          {/* Video prompt */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '10px', fontFamily: 'var(--font-mono)', letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--text3)' }}>Video Prompt</span>
                <span style={{ padding: '2px 7px', borderRadius: '5px', background: 'rgba(0,200,180,0.08)', border: '1px solid rgba(0,200,180,0.2)', fontSize: '10px', color: '#00c8b4', fontFamily: 'var(--font-mono)' }}>Ready to paste</span>
              </div>
              <SmallCopyBtn text={frame.videoPrompt} />
            </div>
            <div style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: '10px', padding: '14px', fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text2)', lineHeight: 1.8 }}>{frame.videoPrompt}</div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Scene Card ──
function SceneCard({ scene, index, tool, copiedId, expanded, onToggle, onCopy, onRegenerate }) {
  const colors = ['#0057ff', '#00c8b4', '#a050ff', '#ff643c', '#e8a020', '#22cc88']
  const color = colors[index % colors.length]
  return (
    <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '14px', overflow: 'hidden', boxShadow: 'var(--shadow)' }}>
      <div onClick={onToggle} style={{ padding: '16px 20px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '14px' }}>
        <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: `${color}18`, border: `1px solid ${color}33`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <span style={{ fontSize: '12px', fontWeight: 800, color, fontFamily: 'var(--font-mono)' }}>{String(scene.scene).padStart(2, '0')}</span>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text)', marginBottom: '2px' }}>{scene.title}</div>
          <div style={{ fontSize: '11px', color: 'var(--text3)', fontFamily: 'var(--font-mono)' }}>⏱ {scene.duration} · 📷 {scene.camera}</div>
        </div>
        <FilterBadge label={tool} />
        <div style={{ display: 'flex', gap: '6px' }} onClick={e => e.stopPropagation()}>
          <button onClick={onRegenerate} disabled={scene.regenerating} style={{ padding: '6px 10px', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: '7px', fontSize: '13px', color: 'var(--text3)', cursor: 'pointer' }}>{scene.regenerating ? '…' : '↺'}</button>
          <button onClick={onCopy} style={{ padding: '6px 14px', background: copiedId === index ? 'rgba(34,204,136,0.1)' : 'var(--blue-light)', border: `1px solid ${copiedId === index ? 'rgba(34,204,136,0.3)' : 'rgba(0,87,255,0.2)'}`, borderRadius: '7px', fontSize: '11px', fontWeight: 700, color: copiedId === index ? '#22cc88' : 'var(--blue)', cursor: 'pointer', fontFamily: 'var(--font-ui)' }}>{copiedId === index ? '✓' : 'Copy'}</button>
        </div>
        <span style={{ color: 'var(--text3)', fontSize: '12px' }}>{expanded ? '▲' : '▼'}</span>
      </div>
      {expanded && (
        <div style={{ borderTop: '1px solid var(--border)', padding: '16px 20px', animation: 'reveal .3s ease both', opacity: 0 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
            <div><div style={{ fontSize: '10px', fontFamily: 'var(--font-mono)', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: '5px' }}>Description</div><div style={{ fontSize: '12px', color: 'var(--text2)', lineHeight: 1.65 }}>{scene.description}</div></div>
            <div><div style={{ fontSize: '10px', fontFamily: 'var(--font-mono)', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: '5px' }}>Visual Direction</div><div style={{ fontSize: '12px', color: 'var(--text2)', lineHeight: 1.65 }}>{scene.visual}</div></div>
          </div>
          <div style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: '10px', padding: '14px', fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text2)', lineHeight: 1.8 }}>
            {scene.regenerating ? <span style={{ color: 'var(--blue)' }}>Regenerating…</span> : scene.prompt}
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
      <div style={{ background: 'var(--bg3)', borderRadius: '10px', padding: '14px', fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text2)', lineHeight: 1.8, maxHeight: '200px', overflowY: 'auto', border: '1px solid var(--border)', marginBottom: '12px' }}>
        {scenes.map((s, i) => <div key={i} style={{ marginBottom: i < scenes.length - 1 ? '12px' : 0 }}><div style={{ color: 'var(--blue)', marginBottom: '3px' }}>SCENE {s.scene} — {s.title}</div><div>{s.prompt}</div>{i < scenes.length - 1 && <div style={{ borderTop: '1px solid var(--border)', marginTop: '10px' }} />}</div>)}
      </div>
      <button onClick={onCopy} style={{ width: '100%', padding: '10px', background: copiedAll ? 'rgba(34,204,136,0.1)' : 'var(--blue)', color: copiedAll ? '#22cc88' : '#fff', border: copiedAll ? '1px solid rgba(34,204,136,0.3)' : 'none', borderRadius: '9px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-ui)', letterSpacing: '.04em', textTransform: 'uppercase', boxShadow: copiedAll ? 'none' : 'var(--shadow-blue)' }}>
        {copiedAll ? '✓ Copied!' : 'Copy Full Shot List'}
      </button>
    </div>
  )
}

function ContextBar({ brandSummary, refs }) {
  return (
    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '18px', padding: '10px 14px', background: 'var(--bg3)', borderRadius: '10px', border: '1px solid var(--border)' }}>
      <span style={{ fontSize: '11px', color: 'var(--text3)', fontFamily: 'var(--font-mono)', marginRight: '4px' }}>Context:</span>
      {brandSummary ? <CtxTag color="blue">✦ Brand Summary</CtxTag> : <span style={{ fontSize: '11px', color: 'var(--text3)', fontFamily: 'var(--font-mono)' }}>No brand summary</span>}
      {refs.length > 0 && <CtxTag color="teal">◈ {refs.length} References</CtxTag>}
    </div>
  )
}

function FilterBadge({ label, color = 'blue' }) {
  const colors = { blue: { bg: 'var(--blue-light)', border: 'rgba(0,87,255,0.15)', text: 'var(--blue)' }, teal: { bg: 'rgba(0,200,180,0.08)', border: 'rgba(0,200,180,0.2)', text: '#00c8b4' }, purple: { bg: 'rgba(160,80,255,0.08)', border: 'rgba(160,80,255,0.2)', text: '#a050ff' } }
  const c = colors[color] || colors.blue
  return <span style={{ padding: '3px 9px', borderRadius: '6px', background: c.bg, border: `1px solid ${c.border}`, fontSize: '11px', color: c.text, fontFamily: 'var(--font-mono)' }}>{label}</span>
}

function ToolBtn({ t, active, onClick }) {
  return <button onClick={onClick} style={{ padding: '7px 14px', borderRadius: '9px', border: `1.5px solid ${active ? 'rgba(0,87,255,0.4)' : 'var(--border)'}`, background: active ? 'var(--blue-light)' : 'var(--bg3)', color: active ? 'var(--blue)' : 'var(--text2)', fontFamily: 'var(--font-ui)', fontSize: '12px', fontWeight: 600, cursor: 'pointer', transition: 'all .2s' }}>{t}</button>
}

function SmallCopyBtn({ text, label, onCopy }) {
  const [copied, setCopied] = useState(false)
  function handleCopy() {
    if (onCopy) { onCopy(); return }
    navigator.clipboard.writeText(text)
    setCopied(true); setTimeout(() => setCopied(false), 2000)
  }
  return <button onClick={handleCopy} style={{ padding: '6px 12px', background: copied ? 'rgba(34,204,136,0.1)' : 'var(--bg3)', border: `1px solid ${copied ? 'rgba(34,204,136,0.3)' : 'var(--border2)'}`, borderRadius: '7px', fontSize: '11px', fontWeight: 700, color: copied ? '#22cc88' : 'var(--text2)', cursor: 'pointer', fontFamily: 'var(--font-ui)', transition: 'all .2s' }}>{label || (copied ? '✓ Copied' : 'Copy')}</button>
}

function CtxTag({ color, children }) {
  const colors = { blue: { bg: 'var(--blue-light)', border: 'rgba(0,87,255,0.25)', text: 'var(--blue)' }, teal: { bg: 'rgba(0,200,180,0.06)', border: 'rgba(0,200,180,0.25)', text: '#00c8b4' } }
  const c = colors[color]
  return <span style={{ padding: '5px 12px', borderRadius: '20px', fontSize: '11px', fontFamily: 'var(--font-mono)', border: `1px solid ${c.border}`, background: c.bg, color: c.text }}>{children}</span>
}

function GeneratingBar({ message }) {
  return <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px 20px', background: 'var(--blue-light)', border: '1px solid rgba(0,87,255,0.2)', borderRadius: '12px', marginBottom: '20px', animation: 'reveal .3s ease both' }}><Spinner /><div><div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--blue)' }}>Lumen is working…</div><div style={{ fontSize: '11px', color: 'var(--text3)', marginTop: '2px', fontFamily: 'var(--font-mono)' }}>{message}</div></div></div>
}

function EmptyState({ icon, title, desc }) {
  return <div style={{ textAlign: 'center', padding: '60px 40px', background: 'var(--bg2)', border: '1.5px dashed rgba(0,87,255,0.15)', borderRadius: '16px', animation: 'reveal .5s .1s ease both', opacity: 0 }}><div style={{ fontSize: '40px', marginBottom: '14px' }}>{icon}</div><div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text)', marginBottom: '8px' }}>{title}</div><div style={{ fontSize: '13px', color: 'var(--text3)', maxWidth: '400px', margin: '0 auto', lineHeight: 1.7 }}>{desc}</div></div>
}

function Label({ children }) {
  return <div style={{ fontSize: '10px', fontFamily: 'var(--font-mono)', letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--text3)', marginBottom: '8px', fontWeight: 500 }}>{children}</div>
}

function Spinner({ small }) {
  return <div style={{ width: small ? '10px' : '14px', height: small ? '10px' : '14px', border: '2px solid rgba(0,87,255,0.2)', borderTopColor: 'var(--blue)', borderRadius: '50%', animation: 'spin .7s linear infinite', flexShrink: 0 }} />
}

function LoadingScreen() {
  return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', fontFamily: 'var(--font-mono)', fontSize: '13px', color: 'var(--text3)' }}>Loading…</div>
}

const selectStyle = { width: '100%', padding: '10px 14px', background: 'var(--bg3)', border: '1.5px solid var(--border)', borderRadius: '10px', color: 'var(--text)', fontFamily: 'var(--font-ui)', fontSize: '13px', outline: 'none', cursor: 'pointer', transition: 'border-color .2s', display: 'block' }
