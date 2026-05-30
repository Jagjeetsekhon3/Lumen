'use client'
import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function BrandsPage() {
  const router = useRouter()
  const [brands, setBrands] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [newName, setNewName] = useState('')
  const [creating, setCreating] = useState(false)
  const [selectedBrand, setSelectedBrand] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [summarising, setSummarising] = useState(false)
  const [pastedText, setPastedText] = useState('')
  const [showTextInput, setShowTextInput] = useState(false)
  const [showUrlInput, setShowUrlInput] = useState(false)
  const [imageUrl, setImageUrl] = useState('')
  const [brandPosts, setBrandPosts] = useState([])
  const [activeTab, setActiveTab] = useState('upload')
  const [deletingId, setDeletingId] = useState(null)
  const guidelinesRef = useRef()
  const postsRef = useRef()

  useEffect(() => { checkAuth(); fetchBrands() }, [])
  useEffect(() => { if (selectedBrand) fetchBrandPosts(selectedBrand.id) }, [selectedBrand])

  async function checkAuth() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.push('/login'); return }
  }

  async function fetchBrands() {
    const { data } = await supabase.from('brands').select('*').order('created_at', { ascending: false })
    setBrands(data || [])
    setLoading(false)
  }

  async function fetchBrandPosts(brandId) {
    const { data } = await supabase.from('brand_posts').select('*').eq('brand_id', brandId).order('created_at', { ascending: false })
    setBrandPosts(data || [])
  }

  async function createBrand(e) {
    e.preventDefault()
    if (!newName.trim()) return
    setCreating(true)
    const { data: { user } } = await supabase.auth.getUser()
    const { data, error } = await supabase.from('brands').insert({ name: newName.trim(), user_id: user.id }).select().single()
    if (!error) { setNewName(''); setShowForm(false); setBrands(prev => [data, ...prev]); setSelectedBrand(data) }
    setCreating(false)
  }

  async function deleteBrand(brandId, e) {
    e.stopPropagation()
    if (!confirm('Delete this brand and all its data? This cannot be undone.')) return
    setDeletingId(brandId)
    await supabase.from('brand_posts').delete().eq('brand_id', brandId)
    await supabase.from('brands').delete().eq('id', brandId)
    setBrands(prev => prev.filter(b => b.id !== brandId))
    if (selectedBrand?.id === brandId) setSelectedBrand(null)
    setDeletingId(null)
  }

  async function handleGuidelinesUpload(e) {
    const file = e.target.files[0]
    if (!file || !selectedBrand) return
    setUploading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const path = `${user.id}/${selectedBrand.id}/${Date.now()}-${file.name}`
      const { error: uploadError } = await supabase.storage.from('brand-guidelines').upload(path, file)
      if (uploadError) throw uploadError
      const { data: { publicUrl } } = supabase.storage.from('brand-guidelines').getPublicUrl(path)
      setSummarising(true)
      const res = await fetch('/api/brand/summarise', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ guidelinesUrl: publicUrl, fileName: file.name, projectName: selectedBrand.name }),
      })
      const result = await res.json()
      if (result.summary) {
        await supabase.from('brands').update({ summary_text: result.summary, guidelines_url: publicUrl }).eq('id', selectedBrand.id)
        const updated = { ...selectedBrand, summary_text: result.summary, guidelines_url: publicUrl }
        setSelectedBrand(updated)
        setBrands(prev => prev.map(b => b.id === selectedBrand.id ? updated : b))
      }
    } catch (err) { alert('Upload failed: ' + err.message) }
    setUploading(false); setSummarising(false)
  }

  async function handleTextSubmit(e) {
    e.preventDefault()
    if (!pastedText.trim() || !selectedBrand) return
    setSummarising(true)
    const res = await fetch('/api/brand/summarise', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ guidelinesText: pastedText, projectName: selectedBrand.name }),
    })
    const result = await res.json()
    if (result.summary) {
      await supabase.from('brands').update({ summary_text: result.summary }).eq('id', selectedBrand.id)
      const updated = { ...selectedBrand, summary_text: result.summary }
      setSelectedBrand(updated)
      setBrands(prev => prev.map(b => b.id === selectedBrand.id ? updated : b))
      setPastedText(''); setShowTextInput(false)
    }
    setSummarising(false)
  }

  async function handlePostsUpload(e) {
    const files = Array.from(e.target.files)
    if (!files.length || !selectedBrand) return
    const { data: { user } } = await supabase.auth.getUser()
    for (const file of files) {
      const path = `${user.id}/${selectedBrand.id}/${Date.now()}-${file.name}`
      const { error } = await supabase.storage.from('approved-posts').upload(path, file)
      if (!error) {
        const { data: { publicUrl } } = supabase.storage.from('approved-posts').getPublicUrl(path)
        await supabase.from('brand_posts').insert({ brand_id: selectedBrand.id, image_url: publicUrl })
      }
    }
    fetchBrandPosts(selectedBrand.id)
  }

  async function handleAddImageUrl(e) {
    e.preventDefault()
    if (!imageUrl.trim() || !selectedBrand) return
    await supabase.from('brand_posts').insert({ brand_id: selectedBrand.id, image_url: imageUrl.trim() })
    setImageUrl(''); setShowUrlInput(false)
    fetchBrandPosts(selectedBrand.id)
  }

  async function regenerateSummary() {
    if (!selectedBrand) return
    setSummarising(true)
    const res = await fetch('/api/brand/summarise', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ guidelinesUrl: selectedBrand.guidelines_url, projectName: selectedBrand.name, approvedPostUrls: brandPosts.map(p => p.image_url) }),
    })
    const result = await res.json()
    if (result.summary) {
      await supabase.from('brands').update({ summary_text: result.summary }).eq('id', selectedBrand.id)
      const updated = { ...selectedBrand, summary_text: result.summary }
      setSelectedBrand(updated)
      setBrands(prev => prev.map(b => b.id === selectedBrand.id ? updated : b))
    }
    setSummarising(false)
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex' }}>
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', backgroundImage: 'linear-gradient(rgba(0,87,255,0.03) 1px,transparent 1px),linear-gradient(90deg,rgba(0,87,255,0.03) 1px,transparent 1px)', backgroundSize: '40px 40px' }} />

      {/* Brands sidebar */}
      <div style={{ width: '260px', flexShrink: 0, background: 'var(--bg2)', borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', height: '100vh', position: 'sticky', top: 0, zIndex: 5 }}>
        <div style={{ padding: '24px 20px 16px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <a href="/dashboard" style={{ fontSize: '11px', color: 'var(--text3)', fontFamily: 'var(--font-mono)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}>← Dashboard</a>
          </div>
          <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text)', marginBottom: '2px' }}>🏢 Brands</div>
          <div style={{ fontSize: '11px', color: 'var(--text3)', fontFamily: 'var(--font-mono)' }}>{brands.length} brand{brands.length !== 1 ? 's' : ''}</div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '12px' }}>
          {brands.map(brand => (
            <div key={brand.id}
              onClick={() => setSelectedBrand(brand)}
              style={{ padding: '12px 14px', borderRadius: '10px', cursor: 'pointer', border: `1px solid ${selectedBrand?.id === brand.id ? 'rgba(0,87,255,0.2)' : 'transparent'}`, background: selectedBrand?.id === brand.id ? 'var(--blue-light)' : 'transparent', marginBottom: '4px', transition: 'all .2s', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: selectedBrand?.id === brand.id ? 'var(--blue)' : 'var(--text)', marginBottom: '2px' }}>{brand.name}</div>
                <div style={{ fontSize: '10px', fontFamily: 'var(--font-mono)', color: 'var(--text3)' }}>{brand.summary_text ? '✓ Summary ready' : 'No summary yet'}</div>
              </div>
              <button onClick={e => deleteBrand(brand.id, e)} disabled={deletingId === brand.id}
                style={{ width: '24px', height: '24px', borderRadius: '6px', background: 'transparent', border: 'none', color: 'var(--text3)', fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,60,60,0.1)'; e.currentTarget.style.color = '#ff3c3c' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text3)' }}>
                {deletingId === brand.id ? '…' : '🗑'}
              </button>
            </div>
          ))}
        </div>

        <div style={{ padding: '12px' }}>
          {showForm ? (
            <form onSubmit={createBrand} style={{ background: 'var(--bg3)', borderRadius: '10px', padding: '12px', border: '1px solid var(--border)' }}>
              <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Brand name" autoFocus required
                style={{ width: '100%', padding: '8px 10px', background: 'var(--bg2)', border: '1.5px solid var(--border)', borderRadius: '8px', color: 'var(--text)', fontFamily: 'var(--font-ui)', fontSize: '13px', outline: 'none', marginBottom: '8px' }}
                onFocus={e => e.target.style.borderColor = 'rgba(0,87,255,0.4)'}
                onBlur={e => e.target.style.borderColor = 'var(--border)'} />
              <div style={{ display: 'flex', gap: '6px' }}>
                <button type="submit" disabled={creating}
                  style={{ flex: 1, padding: '7px', background: 'var(--blue)', color: '#fff', border: 'none', borderRadius: '7px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-ui)' }}>
                  {creating ? '…' : 'Create'}
                </button>
                <button type="button" onClick={() => { setShowForm(false); setNewName('') }}
                  style={{ padding: '7px 10px', background: 'transparent', border: '1px solid var(--border)', borderRadius: '7px', fontSize: '12px', color: 'var(--text3)', cursor: 'pointer' }}>✕</button>
              </div>
            </form>
          ) : (
            <button onClick={() => setShowForm(true)}
              style={{ width: '100%', padding: '10px', background: 'var(--blue)', color: '#fff', border: 'none', borderRadius: '10px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-ui)', letterSpacing: '.04em', textTransform: 'uppercase', boxShadow: 'var(--shadow-blue)' }}>
              + New Brand
            </button>
          )}
        </div>
      </div>

      {/* Main content */}
      <main style={{ flex: 1, overflowY: 'auto', position: 'relative', zIndex: 1 }}>
        {!selectedBrand ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', flexDirection: 'column', gap: '16px', padding: '40px' }}>
            <div style={{ fontSize: '48px' }}>🏢</div>
            <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text)' }}>Select or create a brand</div>
            <div style={{ fontSize: '14px', color: 'var(--text3)', textAlign: 'center', maxWidth: '360px' }}>Each brand holds guidelines and approved posts. All campaigns under the same brand share this context automatically.</div>
          </div>
        ) : (
          <>
            {/* Topbar */}
            <div style={{ position: 'sticky', top: 0, zIndex: 10, padding: '16px 32px', background: 'rgba(248,248,252,0.9)', backdropFilter: 'blur(20px)', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', animation: 'slide-down .5s ease' }}>
              <div>
                <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text)' }}>{selectedBrand.name}</div>
                <div style={{ fontSize: '11px', color: 'var(--text3)', fontFamily: 'var(--font-mono)', marginTop: '2px' }}>Brand Profile · {brandPosts.length} approved posts</div>
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                {selectedBrand.summary_text && (
                  <button onClick={regenerateSummary} disabled={summarising}
                    style={{ padding: '9px 18px', background: 'transparent', border: '1.5px solid var(--border2)', borderRadius: '9px', fontSize: '12px', fontWeight: 700, color: 'var(--text2)', cursor: 'pointer', fontFamily: 'var(--font-ui)', letterSpacing: '.04em', textTransform: 'uppercase' }}>
                    {summarising ? 'Regenerating…' : 'Regenerate Summary'}
                  </button>
                )}
                <a href="/dashboard"
                  style={{ padding: '9px 18px', background: 'var(--blue)', color: '#fff', border: 'none', borderRadius: '9px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-ui)', letterSpacing: '.04em', textTransform: 'uppercase', boxShadow: 'var(--shadow-blue)', textDecoration: 'none', display: 'flex', alignItems: 'center' }}>
                  View Campaigns →
                </a>
              </div>
            </div>

            <div style={{ padding: '28px 32px' }}>
              {/* Brand summary */}
              {selectedBrand.summary_text ? (
                <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '16px', padding: '28px', marginBottom: '24px', boxShadow: 'var(--shadow)', position: 'relative', overflow: 'hidden', animation: 'reveal .5s ease both', opacity: 0 }}>
                  <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: 'linear-gradient(90deg,transparent,var(--blue),rgba(0,87,255,0.3))', animation: 'shimmer-line 3s ease-in-out infinite' }} />
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', padding: '5px 12px', borderRadius: '20px', background: 'var(--blue-light)', border: '1px solid rgba(0,87,255,0.2)', color: 'var(--blue)', fontSize: '10px', letterSpacing: '.15em', textTransform: 'uppercase', fontWeight: 700, marginBottom: '14px' }}>
                    <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: 'var(--blue)', animation: 'dot-beat 2s ease-in-out infinite' }} />
                    Brand Summary — Active across all campaigns
                  </div>
                  <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '28px', fontWeight: 300, color: 'var(--text)', marginBottom: '10px', letterSpacing: '-.5px' }}>{selectedBrand.name}</h2>
                  <p style={{ fontSize: '13px', color: 'var(--text2)', lineHeight: 1.75, whiteSpace: 'pre-wrap' }}>{selectedBrand.summary_text}</p>
                </div>
              ) : (
                <div style={{ background: 'var(--bg2)', border: '1.5px dashed rgba(0,87,255,0.2)', borderRadius: '16px', padding: '32px', marginBottom: '24px', textAlign: 'center', animation: 'reveal .5s ease both', opacity: 0 }}>
                  <div style={{ fontSize: '32px', marginBottom: '10px' }}>🏢</div>
                  <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text)', marginBottom: '6px' }}>No brand summary yet</div>
                  <div style={{ fontSize: '13px', color: 'var(--text3)' }}>Upload guidelines or paste your brand text below</div>
                </div>
              )}

              {/* Two col */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', animation: 'reveal .5s .1s ease both', opacity: 0 }}>
                {/* Guidelines */}
                <div>
                  <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '.1em', color: 'var(--text3)', textTransform: 'uppercase', marginBottom: '12px' }}>Brand Guidelines</div>
                  <div style={{ display: 'flex', gap: '4px', marginBottom: '14px', background: 'var(--bg3)', borderRadius: '10px', padding: '4px', border: '1px solid var(--border)' }}>
                    {['Upload PDF', 'Paste Text'].map(tab => (
                      <button key={tab} onClick={() => setActiveTab(tab === 'Upload PDF' ? 'upload' : 'text')}
                        style={{ flex: 1, padding: '7px', borderRadius: '7px', textAlign: 'center', fontSize: '11px', fontWeight: 700, cursor: 'pointer', transition: 'all .2s', color: activeTab === (tab === 'Upload PDF' ? 'upload' : 'text') ? 'var(--blue)' : 'var(--text3)', background: activeTab === (tab === 'Upload PDF' ? 'upload' : 'text') ? 'var(--bg2)' : 'transparent', border: 'none', fontFamily: 'var(--font-ui)', textTransform: 'uppercase', letterSpacing: '.06em', boxShadow: activeTab === (tab === 'Upload PDF' ? 'upload' : 'text') ? 'var(--shadow)' : 'none' }}>
                        {tab}
                      </button>
                    ))}
                  </div>

                  {activeTab === 'upload' ? (
                    <>
                      <div onClick={() => guidelinesRef.current?.click()}
                        style={{ border: '1.5px dashed rgba(0,87,255,0.2)', borderRadius: '12px', padding: '24px 16px', textAlign: 'center', cursor: 'pointer', background: 'var(--bg3)', transition: 'all .3s', marginBottom: '12px' }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(0,87,255,0.45)'; e.currentTarget.style.background = 'rgba(0,87,255,0.02)' }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(0,87,255,0.2)'; e.currentTarget.style.background = 'var(--bg3)' }}>
                        <div style={{ fontSize: '26px', marginBottom: '8px' }}>📄</div>
                        <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)', marginBottom: '3px' }}>Drop brand guidelines</div>
                        <div style={{ fontSize: '11px', color: 'var(--text3)' }}>PDF, DOC, or TXT</div>
                      </div>
                      <input ref={guidelinesRef} type="file" accept=".pdf,.doc,.docx,.txt" onChange={handleGuidelinesUpload} style={{ display: 'none' }} />
                      {(uploading || summarising) && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px', background: 'var(--blue-light)', border: '1px solid rgba(0,87,255,0.15)', borderRadius: '10px', fontSize: '12px', color: 'var(--blue)', marginBottom: '12px', fontFamily: 'var(--font-mono)' }}>
                          <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--blue)', animation: 'dot-beat 1.5s ease-in-out infinite' }} />
                          {uploading ? 'Uploading…' : 'Lumen is reading your guidelines…'}
                        </div>
                      )}
                      {selectedBrand.guidelines_url && (
                        <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '12px', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div style={{ width: '34px', height: '34px', borderRadius: '9px', background: 'var(--blue-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px' }}>📄</div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text)' }}>Guidelines uploaded</div>
                            <div style={{ fontSize: '10px', color: 'var(--text3)', fontFamily: 'var(--font-mono)' }}>Summary generated ✓</div>
                          </div>
                          <div style={{ padding: '3px 8px', borderRadius: '6px', background: 'rgba(34,204,136,0.1)', border: '1px solid rgba(34,204,136,0.25)', color: '#22cc88', fontSize: '10px', fontWeight: 600 }}>✓</div>
                        </div>
                      )}
                    </>
                  ) : (
                    <form onSubmit={handleTextSubmit}>
                      <textarea value={pastedText} onChange={e => setPastedText(e.target.value)}
                        placeholder="Paste brand guidelines text here — tone of voice, colors, rules, audience, visual style…"
                        style={{ width: '100%', minHeight: '180px', padding: '14px', background: 'var(--bg3)', border: '1.5px solid var(--border)', borderRadius: '12px', color: 'var(--text)', fontFamily: 'var(--font-ui)', fontSize: '13px', lineHeight: 1.7, resize: 'vertical', outline: 'none', transition: 'border-color .2s', marginBottom: '10px' }}
                        onFocus={e => e.target.style.borderColor = 'rgba(0,87,255,0.4)'}
                        onBlur={e => e.target.style.borderColor = 'var(--border)'} />
                      <button type="submit" disabled={summarising || !pastedText.trim()}
                        style={{ width: '100%', padding: '11px', background: summarising ? 'rgba(0,87,255,0.5)' : 'var(--blue)', color: '#fff', border: 'none', borderRadius: '10px', fontFamily: 'var(--font-ui)', fontSize: '13px', fontWeight: 700, letterSpacing: '.05em', textTransform: 'uppercase', cursor: summarising ? 'not-allowed' : 'pointer', boxShadow: 'var(--shadow-blue)' }}>
                        {summarising ? '✦ Lumen is reading…' : '✦ Generate Brand Summary'}
                      </button>
                    </form>
                  )}
                </div>

                {/* Approved posts */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                    <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '.1em', color: 'var(--text3)', textTransform: 'uppercase' }}>Approved Posts</div>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button onClick={() => setShowUrlInput(v => !v)}
                        style={{ padding: '5px 10px', background: showUrlInput ? 'var(--blue-light)' : 'transparent', border: `1px solid ${showUrlInput ? 'rgba(0,87,255,0.2)' : 'var(--border2)'}`, borderRadius: '7px', fontSize: '11px', fontWeight: 600, color: showUrlInput ? 'var(--blue)' : 'var(--text2)', cursor: 'pointer', fontFamily: 'var(--font-ui)' }}>🔗 URL</button>
                      <button onClick={() => postsRef.current?.click()}
                        style={{ padding: '5px 10px', background: 'transparent', border: '1px solid var(--border2)', borderRadius: '7px', fontSize: '11px', fontWeight: 600, color: 'var(--text2)', cursor: 'pointer', fontFamily: 'var(--font-ui)' }}>↑ Upload</button>
                      <input ref={postsRef} type="file" accept="image/*" multiple onChange={handlePostsUpload} style={{ display: 'none' }} />
                    </div>
                  </div>

                  {showUrlInput && (
                    <form onSubmit={handleAddImageUrl} style={{ marginBottom: '10px', background: 'var(--bg2)', border: '1.5px solid rgba(0,87,255,0.2)', borderRadius: '10px', padding: '12px', animation: 'reveal .3s ease both' }}>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <input value={imageUrl} onChange={e => setImageUrl(e.target.value)} placeholder="Paste image URL…"
                          style={{ flex: 1, padding: '8px 12px', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text)', fontFamily: 'var(--font-ui)', fontSize: '12px', outline: 'none' }}
                          onFocus={e => e.target.style.borderColor = 'rgba(0,87,255,0.4)'}
                          onBlur={e => e.target.style.borderColor = 'var(--border)'} autoFocus />
                        <button type="submit" style={{ padding: '8px 14px', background: 'var(--blue)', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-ui)' }}>+ Add</button>
                        <button type="button" onClick={() => { setShowUrlInput(false); setImageUrl('') }}
                          style={{ padding: '8px 10px', background: 'transparent', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text3)', cursor: 'pointer', fontSize: '12px' }}>✕</button>
                      </div>
                    </form>
                  )}

                  <div onClick={() => postsRef.current?.click()}
                    style={{ border: '1.5px dashed rgba(0,87,255,0.2)', borderRadius: '12px', padding: '20px 16px', textAlign: 'center', cursor: 'pointer', background: 'var(--bg3)', transition: 'all .3s', marginBottom: '10px' }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(0,87,255,0.45)'; e.currentTarget.style.background = 'rgba(0,87,255,0.02)' }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(0,87,255,0.2)'; e.currentTarget.style.background = 'var(--bg3)' }}>
                    <div style={{ fontSize: '22px', marginBottom: '6px' }}>🖼</div>
                    <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text)', marginBottom: '2px' }}>Drop approved posts</div>
                    <div style={{ fontSize: '11px', color: 'var(--text3)' }}>Real published content</div>
                  </div>

                  {brandPosts.length > 0 && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '6px' }}>
                      {brandPosts.slice(0, 8).map(p => (
                        <div key={p.id} style={{ aspectRatio: '1', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--border)', background: 'var(--bg3)' }}>
                          <img src={p.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => e.target.style.display = 'none'} />
                        </div>
                      ))}
                      {brandPosts.length > 8 && (
                        <div style={{ aspectRatio: '1', borderRadius: '8px', background: 'var(--bg3)', border: '1px dashed var(--border2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', color: 'var(--text3)', fontFamily: 'var(--font-mono)' }}>+{brandPosts.length - 8}</div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  )
}
