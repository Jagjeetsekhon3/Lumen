'use client'
import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useParams, useRouter } from 'next/navigation'
import Sidebar from '@/components/Sidebar'

export default function BrandVaultPage() {
  const { id } = useParams()
  const router = useRouter()
  const [project, setProject] = useState(null)
  const [summary, setSummary] = useState(null)
  const [approvedPosts, setApprovedPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [summarising, setSummarising] = useState(false)
  const [uploadingPosts, setUploadingPosts] = useState(false)
  const guidelinesRef = useRef()
  const postsRef = useRef()

  useEffect(() => { fetchAll() }, [id])

  async function fetchAll() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.push('/login'); return }

    const [{ data: proj }, { data: sum }, { data: posts }] = await Promise.all([
      supabase.from('projects').select('*').eq('id', id).single(),
      supabase.from('brand_summaries').select('*').eq('project_id', id).order('created_at', { ascending: false }).limit(1).single(),
      supabase.from('approved_posts').select('*').eq('project_id', id).order('created_at', { ascending: false }),
    ])
    setProject(proj)
    setSummary(sum)
    setApprovedPosts(posts || [])
    setLoading(false)
  }

  async function handleGuidelinesUpload(e) {
    const file = e.target.files[0]
    if (!file) return
    setUploading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const path = `${user.id}/${id}/${Date.now()}-${file.name}`
      const { error: uploadError } = await supabase.storage.from('guidelines').upload(path, file)
      if (uploadError) throw uploadError
      const { data: { publicUrl } } = supabase.storage.from('guidelines').getPublicUrl(path)
      // Auto-summarise after upload
      setSummarising(true)
      const res = await fetch('/api/brand/summarise', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: id, guidelinesUrl: publicUrl, fileName: file.name }),
      })
      const result = await res.json()
      if (result.summary) {
        await supabase.from('brand_summaries').upsert({ project_id: id, summary_text: result.summary, guidelines_url: publicUrl })
        fetchAll()
      }
    } catch (err) {
      alert('Upload failed: ' + err.message)
    } finally {
      setUploading(false)
      setSummarising(false)
    }
  }

  async function handlePostsUpload(e) {
    const files = Array.from(e.target.files)
    if (!files.length) return
    setUploadingPosts(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      for (const file of files) {
        const path = `${user.id}/${id}/${Date.now()}-${file.name}`
        const { error } = await supabase.storage.from('approved-posts').upload(path, file)
        if (!error) {
          const { data: { publicUrl } } = supabase.storage.from('approved-posts').getPublicUrl(path)
          await supabase.from('approved_posts').insert({ project_id: id, image_url: publicUrl })
        }
      }
      fetchAll()
    } catch (err) {
      alert('Upload failed: ' + err.message)
    } finally {
      setUploadingPosts(false)
    }
  }

  async function regenerateSummary() {
    if (!summary?.guidelines_url) return alert('Upload guidelines first')
    setSummarising(true)
    const res = await fetch('/api/brand/summarise', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectId: id, guidelinesUrl: summary.guidelines_url, approvedPostUrls: approvedPosts.map(p => p.image_url) }),
    })
    const result = await res.json()
    if (result.summary) {
      await supabase.from('brand_summaries').upsert({ project_id: id, summary_text: result.summary, guidelines_url: summary.guidelines_url })
      fetchAll()
    }
    setSummarising(false)
  }

  if (loading) return <LoadingScreen />

  const tags = summary?.summary_text ? extractTags(summary.summary_text) : []

  return (
    <div style={{ display: 'flex', height: '100vh', background: 'var(--bg)' }}>
      <Sidebar projectId={id} projectName={project?.name} client={project?.client} />
      <main style={{ flex: 1, overflowY: 'auto' }}>
        {/* Topbar */}
        <div style={{ position: 'sticky', top: 0, zIndex: 10, padding: '16px 32px', background: 'rgba(248,248,252,0.9)', backdropFilter: 'blur(20px)', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', animation: 'slide-down .5s ease' }}>
          <div>
            <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text)', letterSpacing: '-.4px' }}>Brand Vault</div>
            <div style={{ fontSize: '11px', color: 'var(--text3)', fontFamily: 'var(--font-mono)', marginTop: '2px' }}>{project?.name}{project?.client ? ` · ${project.client}` : ''}</div>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            {summary && <Btn ghost onClick={regenerateSummary} disabled={summarising}>{summarising ? 'Regenerating…' : 'Regenerate Summary'}</Btn>}
            <Btn blue onClick={() => guidelinesRef.current?.click()} disabled={uploading}>{uploading ? 'Uploading…' : '+ Upload Guidelines'}</Btn>
          </div>
        </div>

        <div style={{ padding: '28px 32px' }}>
          {/* Ticker */}
          <Ticker items={['BRAND VAULT', summary ? 'SUMMARY READY' : 'AWAITING UPLOAD', `${approvedPosts.length} APPROVED POSTS`, 'CONTEXT LAYER ACTIVE']} />

          {/* Brand summary card */}
          {summary ? (
            <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '16px', padding: '28px', marginBottom: '24px', boxShadow: 'var(--shadow)', position: 'relative', overflow: 'hidden', animation: 'reveal .6s .1s ease both', opacity: 0 }}>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: 'linear-gradient(90deg,transparent,var(--blue),rgba(0,87,255,0.3))', animation: 'shimmer-line 3s ease-in-out infinite' }} />
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', padding: '5px 12px', borderRadius: '20px', background: 'var(--blue-light)', border: '1px solid rgba(0,87,255,0.2)', color: 'var(--blue)', fontSize: '10px', letterSpacing: '.15em', textTransform: 'uppercase', fontWeight: 700, marginBottom: '14px' }}>
                <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: 'var(--blue)', animation: 'dot-beat 2s ease-in-out infinite' }} />
                Brand Summary
              </div>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '28px', fontWeight: 300, color: 'var(--text)', marginBottom: '10px', letterSpacing: '-.5px' }}>{project?.name}</h2>
              <p style={{ fontSize: '13px', color: 'var(--text2)', lineHeight: 1.75, whiteSpace: 'pre-wrap' }}>{summary.summary_text}</p>
              {tags.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '18px' }}>
                  {tags.map(t => <span key={t} style={{ padding: '5px 12px', borderRadius: '20px', background: 'var(--bg3)', border: '1px solid var(--border2)', fontSize: '11px', color: 'var(--text2)', fontFamily: 'var(--font-mono)' }}>{t}</span>)}
                </div>
              )}
            </div>
          ) : (
            <div style={{ background: 'var(--bg2)', border: '1.5px dashed rgba(0,87,255,0.2)', borderRadius: '16px', padding: '40px', marginBottom: '24px', textAlign: 'center', animation: 'reveal .6s .1s ease both', opacity: 0 }}>
              <div style={{ fontSize: '32px', marginBottom: '12px' }}>🏛</div>
              <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text)', marginBottom: '6px' }}>No brand summary yet</div>
              <div style={{ fontSize: '13px', color: 'var(--text3)' }}>Upload your brand guidelines and Claude will generate a summary automatically</div>
            </div>
          )}

          {/* Two col uploads */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            {/* Guidelines */}
            <div style={{ animation: 'reveal .6s .2s ease both', opacity: 0 }}>
              <SectionHead title="Guidelines">
                <input ref={guidelinesRef} type="file" accept=".pdf,.doc,.docx,.txt" onChange={handleGuidelinesUpload} style={{ display: 'none' }} />
              </SectionHead>
              <UploadZone icon="📄" title="Drop brand guidelines" sub="PDF, DOC, or TXT" types={['PDF','DOC','TXT']} onClick={() => guidelinesRef.current?.click()} />
              {summarising && <StatusBadge>Claude is reading your guidelines…</StatusBadge>}
              {summary?.guidelines_url && (
                <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '12px', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '12px', boxShadow: 'var(--shadow)' }}>
                  <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'var(--blue-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>📄</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)', marginBottom: '2px' }}>Guidelines uploaded</div>
                    <div style={{ fontSize: '11px', color: 'var(--text3)', fontFamily: 'var(--font-mono)' }}>Summary generated ✓</div>
                  </div>
                  <div style={{ padding: '3px 9px', borderRadius: '6px', background: 'rgba(34,204,136,0.1)', border: '1px solid rgba(34,204,136,0.25)', color: '#22cc88', fontSize: '10px', fontWeight: 600 }}>✓ Active</div>
                </div>
              )}
            </div>

            {/* Approved posts */}
            <div style={{ animation: 'reveal .6s .3s ease both', opacity: 0 }}>
              <SectionHead title="Approved Posts">
                <Btn ghost onClick={() => postsRef.current?.click()} disabled={uploadingPosts} style={{ padding: '5px 12px', fontSize: '10px' }}>{uploadingPosts ? 'Uploading…' : '+ Add'}</Btn>
                <input ref={postsRef} type="file" accept="image/*" multiple onChange={handlePostsUpload} style={{ display: 'none' }} />
              </SectionHead>
              <UploadZone icon="🖼" title="Drop approved posts" sub="Real published content" types={['JPG','PNG','WEBP']} onClick={() => postsRef.current?.click()} />
              {approvedPosts.length > 0 && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '8px', marginTop: '10px' }}>
                  {approvedPosts.slice(0, 7).map(p => (
                    <div key={p.id} style={{ aspectRatio: '1', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--border)', background: 'var(--bg3)' }}>
                      <img src={p.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                  ))}
                  {approvedPosts.length > 7 && (
                    <div style={{ aspectRatio: '1', borderRadius: '8px', background: 'var(--bg3)', border: '1px dashed var(--border2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', color: 'var(--text3)', fontFamily: 'var(--font-mono)' }}>+{approvedPosts.length - 7}</div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

function extractTags(text) {
  const keywords = ['bold','minimal','dark','light','editorial','cinematic','energetic','luxury','playful','serious','modern','classic','vibrant','muted','product','lifestyle']
  return keywords.filter(k => text.toLowerCase().includes(k)).slice(0, 8).map(k => `#${k}`)
}

function LoadingScreen() {
  return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', fontFamily: 'var(--font-mono)', fontSize: '13px', color: 'var(--text3)' }}>Loading…</div>
}

function Btn({ blue, ghost, children, onClick, disabled, style = {} }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{ padding: '9px 18px', borderRadius: '9px', fontFamily: 'var(--font-ui)', fontSize: '12px', fontWeight: 700, cursor: disabled ? 'not-allowed' : 'pointer', letterSpacing: '.04em', textTransform: 'uppercase', border: 'none', transition: 'all .2s', opacity: disabled ? .6 : 1, background: blue ? 'var(--blue)' : 'transparent', color: blue ? '#fff' : 'var(--text2)', boxShadow: blue ? 'var(--shadow-blue)' : 'none', border: ghost ? '1.5px solid var(--border2)' : 'none', ...style }}>{children}</button>
  )
}

function SectionHead({ title, children }) {
  return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}><span style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '.1em', color: 'var(--text3)', textTransform: 'uppercase' }}>{title}</span><div style={{ display: 'flex', gap: '8px' }}>{children}</div></div>
}

function UploadZone({ icon, title, sub, types, onClick }) {
  const [hover, setHover] = useState(false)
  return (
    <div onClick={onClick} onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{ border: `1.5px dashed rgba(0,87,255,${hover ? '.45' : '.2'})`, borderRadius: '12px', padding: '24px 16px', textAlign: 'center', cursor: 'pointer', background: hover ? 'rgba(0,87,255,0.02)' : 'var(--bg3)', transition: 'all .3s', marginBottom: '12px' }}>
      <div style={{ fontSize: '26px', marginBottom: '8px', display: 'block', transform: hover ? 'translateY(-4px)' : 'none', transition: 'transform .3s' }}>{icon}</div>
      <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)', marginBottom: '3px' }}>{title}</div>
      <div style={{ fontSize: '11px', color: 'var(--text3)', marginBottom: '10px' }}>{sub}</div>
      <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
        {types.map(t => <span key={t} style={{ padding: '3px 8px', borderRadius: '5px', background: 'var(--bg2)', border: '1px solid var(--border)', fontSize: '10px', fontFamily: 'var(--font-mono)', color: 'var(--text3)' }}>{t}</span>)}
      </div>
    </div>
  )
}

function StatusBadge({ children }) {
  return <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px', background: 'var(--blue-light)', border: '1px solid rgba(0,87,255,0.15)', borderRadius: '10px', fontSize: '12px', color: 'var(--blue)', marginBottom: '12px', fontFamily: 'var(--font-mono)' }}><div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--blue)', animation: 'dot-beat 1.5s ease-in-out infinite' }} />{children}</div>
}

function Ticker({ items }) {
  const doubled = [...items, ...items]
  return (
    <div style={{ overflow: 'hidden', border: '1px solid var(--border)', borderRadius: '12px', marginBottom: '24px', background: 'var(--bg2)', boxShadow: 'var(--shadow)', animation: 'reveal .5s ease both', opacity: 0 }}>
      <div style={{ overflow: 'hidden', padding: '10px 0' }}>
        <div style={{ display: 'flex', animation: 'ticker-scroll 25s linear infinite', whiteSpace: 'nowrap' }}>
          {doubled.map((item, i) => (
            <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: '14px', padding: '0 20px', fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--text3)', letterSpacing: '.1em' }}>
              {item} <span style={{ color: 'var(--blue)', opacity: .6 }}>✦</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}
