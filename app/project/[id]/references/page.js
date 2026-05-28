'use client'
import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useParams, useRouter } from 'next/navigation'
import Sidebar from '@/components/Sidebar'

const TAGS = ['typography', 'background', 'product', 'color', 'other']

export default function ReferencesPage() {
  const { id } = useParams()
  const router = useRouter()
  const [project, setProject] = useState(null)
  const [refs, setRefs] = useState([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [extracting, setExtracting] = useState(false)
  const [visualBrief, setVisualBrief] = useState('')
  const [pendingTag, setPendingTag] = useState('typography')
  const [pasteUrl, setPasteUrl] = useState('')
  const [pasteTag, setPasteTag] = useState('typography')
  const [addingUrl, setAddingUrl] = useState(false)
  const [showUrlInput, setShowUrlInput] = useState(false)
  const uploadRef = useRef()

  useEffect(() => { fetchAll() }, [id])

  async function fetchAll() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.push('/login'); return }
    const [{ data: proj }, { data: refData }] = await Promise.all([
      supabase.from('projects').select('*, brands(*)').eq('id', id).single(),
      supabase.from('reference_images').select('*').eq('project_id', id).order('created_at'),
    ])
    setProject(proj)
    setRefs(refData || [])
    setLoading(false)
  }

  async function handleUpload(e) {
    const files = Array.from(e.target.files)
    if (!files.length) return
    setUploading(true)
    const { data: { user } } = await supabase.auth.getUser()
    for (const file of files) {
      const path = `${user.id}/${id}/${Date.now()}-${file.name}`
      const { error } = await supabase.storage.from('reference-images').upload(path, file)
      if (!error) {
        const { data: { publicUrl } } = supabase.storage.from('reference-images').getPublicUrl(path)
        await supabase.from('reference_images').insert({ project_id: id, image_url: publicUrl, tag: pendingTag })
      }
    }
    fetchAll()
    setUploading(false)
  }

  async function handleAddUrl(e) {
    e?.preventDefault()
    if (!pasteUrl.trim()) return
    // Accept any image URL — Pinterest, Behance, direct links etc
    const url = pasteUrl.trim()
    setAddingUrl(true)
    const { error } = await supabase.from('reference_images').insert({
      project_id: id,
      image_url: url,
      tag: pasteTag,
    })
    if (!error) {
      setPasteUrl('')
      setShowUrlInput(false)
      fetchAll()
    } else {
      alert('Failed to add: ' + error.message)
    }
    setAddingUrl(false)
  }

  async function updateTag(refId, newTag) {
    await supabase.from('reference_images').update({ tag: newTag }).eq('id', refId)
    setRefs(prev => prev.map(r => r.id === refId ? { ...r, tag: newTag } : r))
  }

  async function deleteRef(refId) {
    await supabase.from('reference_images').delete().eq('id', refId)
    setRefs(prev => prev.filter(r => r.id !== refId))
  }

  async function extractVisualBrief() {
    if (refs.length === 0) return alert('Add references first')
    setExtracting(true)
    const res = await fetch('/api/reference/extract', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refs: refs.map(r => ({ url: r.image_url, tag: r.tag })) }),
    })
    const result = await res.json()
    if (result.brief) setVisualBrief(result.brief)
    setExtracting(false)
  }

  if (loading) return <LoadingScreen />

  return (
    <div style={{ display: 'flex', height: '100vh', background: 'var(--bg)' }}>
      <Sidebar projectId={id} projectName={project?.name} client={project?.client} />
      <main style={{ flex: 1, overflowY: 'auto' }}>

        {/* Topbar */}
        <div style={{ position: 'sticky', top: 0, zIndex: 10, padding: '16px 32px', background: 'rgba(248,248,252,0.9)', backdropFilter: 'blur(20px)', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', animation: 'slide-down .5s ease' }}>
          <div>
            <div style={{ fontSize: '18px', fontWeight: 700 }}>Reference Board</div>
            <div style={{ fontSize: '11px', color: 'var(--text3)', fontFamily: 'var(--font-mono)', marginTop: '2px' }}>{project?.name} · {refs.length} references</div>
          </div>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <select value={pendingTag} onChange={e => setPendingTag(e.target.value)}
              style={{ padding: '8px 12px', background: 'var(--bg2)', border: '1px solid var(--border2)', borderRadius: '8px', fontSize: '12px', color: 'var(--text2)', fontFamily: 'var(--font-ui)', cursor: 'pointer' }}>
              {TAGS.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
            </select>
            <button onClick={() => setShowUrlInput(v => !v)}
              style={{ padding: '9px 18px', background: showUrlInput ? 'var(--blue-light)' : 'transparent', color: showUrlInput ? 'var(--blue)' : 'var(--text2)', border: `1.5px solid ${showUrlInput ? 'rgba(0,87,255,0.3)' : 'var(--border2)'}`, borderRadius: '9px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-ui)', letterSpacing: '.04em', textTransform: 'uppercase', transition: 'all .2s' }}>
              🔗 Paste URL
            </button>
            <button onClick={() => uploadRef.current?.click()} disabled={uploading}
              style={{ padding: '9px 18px', background: 'var(--blue)', color: '#fff', border: 'none', borderRadius: '9px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', letterSpacing: '.04em', textTransform: 'uppercase', boxShadow: 'var(--shadow-blue)', fontFamily: 'var(--font-ui)' }}>
              {uploading ? 'Uploading…' : '↑ Upload'}
            </button>
            <input ref={uploadRef} type="file" accept="image/*" multiple onChange={handleUpload} style={{ display: 'none' }} />
          </div>
        </div>

        <div style={{ padding: '28px 32px' }}>

          {/* URL Paste Panel */}
          {showUrlInput && (
            <div style={{ background: 'var(--bg2)', border: '1.5px solid rgba(0,87,255,0.2)', borderRadius: '14px', padding: '20px 24px', marginBottom: '20px', boxShadow: 'var(--shadow-blue)', animation: 'reveal .3s ease both' }}>
              <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)', marginBottom: '4px' }}>Paste Image URL</div>
              <div style={{ fontSize: '12px', color: 'var(--text3)', marginBottom: '16px' }}>Pinterest, Behance, Instagram, any direct image link</div>
              <form onSubmit={handleAddUrl} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                <input
                  value={pasteUrl}
                  onChange={e => setPasteUrl(e.target.value)}
                  placeholder="https://i.pinimg.com/... or any image URL"
                  style={{ flex: 1, minWidth: '280px', padding: '11px 14px', background: 'var(--bg3)', border: '1.5px solid var(--border)', borderRadius: '10px', color: 'var(--text)', fontFamily: 'var(--font-ui)', fontSize: '13px', outline: 'none', transition: 'border-color .2s' }}
                  onFocus={e => e.target.style.borderColor = 'rgba(0,87,255,0.4)'}
                  onBlur={e => e.target.style.borderColor = 'var(--border)'}
                  autoFocus
                />
                <select value={pasteTag} onChange={e => setPasteTag(e.target.value)}
                  style={{ padding: '11px 14px', background: 'var(--bg3)', border: '1.5px solid var(--border)', borderRadius: '10px', color: 'var(--text2)', fontFamily: 'var(--font-ui)', fontSize: '13px', cursor: 'pointer', outline: 'none' }}>
                  {TAGS.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
                </select>
                <button type="submit" disabled={addingUrl || !pasteUrl.trim()}
                  style={{ padding: '11px 22px', background: addingUrl ? 'rgba(0,87,255,0.5)' : 'var(--blue)', color: '#fff', border: 'none', borderRadius: '10px', fontFamily: 'var(--font-ui)', fontSize: '13px', fontWeight: 700, cursor: addingUrl ? 'not-allowed' : 'pointer', letterSpacing: '.04em', textTransform: 'uppercase', boxShadow: 'var(--shadow-blue)', whiteSpace: 'nowrap' }}>
                  {addingUrl ? 'Adding…' : '+ Add Reference'}
                </button>
                <button type="button" onClick={() => { setShowUrlInput(false); setPasteUrl('') }}
                  style={{ padding: '11px 16px', background: 'transparent', border: '1px solid var(--border2)', borderRadius: '10px', color: 'var(--text3)', cursor: 'pointer', fontFamily: 'var(--font-ui)', fontSize: '13px' }}>
                  Cancel
                </button>
              </form>

              {/* URL preview */}
              {pasteUrl.trim() && (
                <div style={{ marginTop: '14px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text3)', fontFamily: 'var(--font-mono)' }}>Preview:</div>
                  <img
                    src={pasteUrl.trim()} alt="preview"
                    style={{ height: '60px', width: '60px', objectFit: 'cover', borderRadius: '8px', border: '1px solid var(--border)' }}
                    onError={e => { e.target.style.display = 'none' }}
                  />
                </div>
              )}
            </div>
          )}

          {/* Visual brief bar */}
          {(visualBrief || refs.length > 0) && (
            <div style={{ background: 'var(--bg2)', border: '1px solid rgba(0,87,255,0.15)', borderRadius: '12px', padding: '16px 20px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '14px', boxShadow: 'var(--shadow)', animation: 'reveal .5s ease both', opacity: 0 }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '9px', background: 'var(--blue-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', flexShrink: 0 }}>✦</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)', marginBottom: '3px' }}>Visual Language Brief {visualBrief ? '— generated' : ''}</div>
                <div style={{ fontSize: '12px', color: 'var(--text2)' }}>{visualBrief || 'Tag your references and click Auto-Extract to generate a visual brief'}</div>
              </div>
              <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                {refs.length > 0 && (
                  <button onClick={extractVisualBrief} disabled={extracting}
                    style={{ padding: '8px 14px', background: extracting ? 'rgba(0,87,255,0.4)' : 'var(--blue)', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '11px', fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-ui)', letterSpacing: '.05em', textTransform: 'uppercase' }}>
                    {extracting ? 'Extracting…' : 'Auto-Extract Brief'}
                  </button>
                )}
                {visualBrief && (
                  <a href={`/project/${id}/prompts?brief=${encodeURIComponent(visualBrief)}`}
                    style={{ padding: '8px 14px', background: 'var(--blue-light)', border: '1px solid rgba(0,87,255,0.2)', borderRadius: '8px', fontSize: '11px', fontWeight: 700, color: 'var(--blue)', fontFamily: 'var(--font-ui)', textDecoration: 'none', letterSpacing: '.05em', textTransform: 'uppercase' }}>
                    Send to Prompt Builder →
                  </a>
                )}
              </div>
            </div>
          )}

          {/* Reference grid */}
          {refs.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '80px 40px', background: 'var(--bg2)', border: '1.5px dashed rgba(0,87,255,0.2)', borderRadius: '16px', animation: 'reveal .5s .1s ease both', opacity: 0 }}>
              <div style={{ fontSize: '40px', marginBottom: '14px' }}>🎨</div>
              <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text)', marginBottom: '6px' }}>No references yet</div>
              <div style={{ fontSize: '13px', color: 'var(--text3)', marginBottom: '20px' }}>Upload images or paste URLs from Pinterest, Behance, anywhere</div>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                <button onClick={() => setShowUrlInput(true)}
                  style={{ padding: '10px 20px', background: 'var(--blue-light)', border: '1px solid rgba(0,87,255,0.2)', borderRadius: '10px', color: 'var(--blue)', fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-ui)' }}>
                  🔗 Paste URL
                </button>
                <button onClick={() => uploadRef.current?.click()}
                  style={{ padding: '10px 20px', background: 'var(--blue)', border: 'none', borderRadius: '10px', color: '#fff', fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-ui)', boxShadow: 'var(--shadow-blue)' }}>
                  ↑ Upload Image
                </button>
              </div>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '14px', animation: 'reveal .5s .1s ease both', opacity: 0 }}>
              {refs.map(ref => <RefCard key={ref.id} ref_={ref} onTagChange={updateTag} onDelete={deleteRef} />)}
              <AddCard onUpload={() => uploadRef.current?.click()} onUrl={() => setShowUrlInput(true)} />
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

function RefCard({ ref_, onTagChange, onDelete }) {
  const [hover, setHover] = useState(false)
  const tagColors = { typography: '#0057ff', background: '#00c8b4', product: '#a050ff', color: '#ff643c', other: '#888' }
  return (
    <div onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{ borderRadius: '12px', overflow: 'hidden', border: `1px solid ${hover ? 'rgba(0,87,255,0.2)' : 'var(--border)'}`, background: 'var(--bg2)', transition: 'all .3s', transform: hover ? 'scale(1.02)' : 'none', boxShadow: hover ? 'var(--shadow-hover)' : 'var(--shadow)', position: 'relative' }}>
      <div style={{ aspectRatio: '1', overflow: 'hidden', position: 'relative', background: 'var(--bg3)' }}>
        <img src={ref_.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          onError={e => { e.target.style.display = 'none'; e.target.parentElement.innerHTML += '<div style="display:flex;align-items:center;justify-content:center;height:100%;font-size:11px;color:#9898b8;font-family:monospace;padding:10px;text-align:center">Image unavailable<br/>URL saved</div>' }} />
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,87,255,0.85)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px', opacity: hover ? 1 : 0, transition: 'opacity .25s' }}>
          <a href={ref_.image_url} target="_blank" rel="noreferrer"
            style={{ background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.3)', borderRadius: '8px', padding: '7px 14px', color: '#fff', fontSize: '12px', cursor: 'pointer', fontFamily: 'var(--font-ui)', textDecoration: 'none' }}>
            Open ↗
          </a>
          <button onClick={() => onDelete(ref_.id)}
            style={{ background: 'rgba(255,60,60,0.3)', border: '1px solid rgba(255,60,60,0.4)', borderRadius: '8px', padding: '7px 14px', color: '#fff', fontSize: '12px', cursor: 'pointer', fontFamily: 'var(--font-ui)' }}>
            Remove
          </button>
        </div>
      </div>
      <div style={{ padding: '10px 12px' }}>
        <select value={ref_.tag} onChange={e => onTagChange(ref_.id, e.target.value)}
          style={{ width: '100%', padding: '6px 10px', borderRadius: '8px', border: `1px solid ${tagColors[ref_.tag]}33`, background: `${tagColors[ref_.tag]}11`, color: tagColors[ref_.tag], fontSize: '11px', fontFamily: 'var(--font-mono)', fontWeight: 500, cursor: 'pointer', letterSpacing: '.08em', textTransform: 'uppercase' }}>
          {TAGS.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
        </select>
      </div>
    </div>
  )
}

function AddCard({ onUpload, onUrl }) {
  const [hover, setHover] = useState(false)
  return (
    <div onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{ borderRadius: '12px', border: `1.5px dashed rgba(0,87,255,${hover ? '.5' : '.2'})`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', background: hover ? 'var(--blue-light)' : 'transparent', transition: 'all .3s', gap: '12px', padding: '24px', minHeight: '180px' }}>
      <span style={{ fontSize: '24px', color: 'var(--blue)', opacity: hover ? 1 : .4 }}>+</span>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
        <button onClick={onUrl}
          style={{ padding: '8px', background: 'var(--blue-light)', border: '1px solid rgba(0,87,255,0.2)', borderRadius: '8px', color: 'var(--blue)', fontSize: '11px', fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-ui)' }}>
          🔗 Paste URL
        </button>
        <button onClick={onUpload}
          style={{ padding: '8px', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text2)', fontSize: '11px', fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-ui)' }}>
          ↑ Upload
        </button>
      </div>
    </div>
  )
}

function LoadingScreen() {
  return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', fontFamily: 'var(--font-mono)', fontSize: '13px', color: 'var(--text3)' }}>Loading…</div>
}
