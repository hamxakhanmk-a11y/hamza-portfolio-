'use client';

import { useState, useEffect, useRef } from 'react';
import { siteConfig } from '@/data/config';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;

// ── Image compression ──────────────────────────────────────────
async function compressImage(file) {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const MAX = 1800;
      const ratio = Math.min(MAX / img.width, MAX / img.height, 1);
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * ratio);
      canvas.height = Math.round(img.height * ratio);
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(blob => {
        resolve(new File([blob], 'image.jpg', { type: 'image/jpeg' }));
        URL.revokeObjectURL(url);
      }, 'image/jpeg', 0.88);
    };
    img.src = url;
  });
}

// ── Upload with client-side compression ───────────────────────
async function uploadImage(file, token, bucket = 'artworks') {
  const compressed = await compressImage(file);

  const fd = new FormData();
  fd.append('file', compressed);
  fd.append('bucket', bucket);

  const res = await fetch('/api/admin/upload', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` },
    body: fd,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Upload failed');
  }

  const { url } = await res.json();
  return url;
}

// ── Empty form state ───────────────────────────────────────────
const emptyForm = {
  title: '', description: '', medium: '', size: '', price: '',
  section: 'shop', available: true,
};

export default function AdminPage() {
  const [token, setToken] = useState(null);
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  // Artwork state
  const [artworks, setArtworks] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState(null);
  const [saving, setSaving] = useState(false);
  const [artMsg, setArtMsg] = useState('');

  // Site photos state
  const [siteImages, setSiteImages] = useState({ hero: '', about: '' });
  const [heroFile, setHeroFile] = useState(null);
  const [heroPreview, setHeroPreview] = useState(null);
  const [aboutFile, setAboutFile] = useState(null);
  const [aboutPreview, setAboutPreview] = useState(null);
  const [photoMsg, setPhotoMsg] = useState('');
  const [uploadingPhoto, setUploadingPhoto] = useState('');

  const [activeTab, setActiveTab] = useState('artworks');

  const fileRef = useRef(null);
  const heroRef = useRef(null);
  const aboutRef = useRef(null);

  useEffect(() => {
    const t = localStorage.getItem('admin_token');
    if (t) { setToken(t); loadAll(t); }
  }, []);

  async function loadAll(t) {
    await Promise.all([fetchArtworks(), fetchSiteImages()]);
  }

  async function fetchArtworks() {
    const res = await fetch('/api/artworks');
    const data = await res.json();
    setArtworks(Array.isArray(data) ? data : []);
  }

  async function fetchSiteImages() {
    const res = await fetch('/api/site-images');
    const data = await res.json();
    setSiteImages(data || {});
  }

  // ── Login ──────────────────────────────────────────────────
  async function login(e) {
    e.preventDefault();
    setLoginError('');
    const res = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });
    if (res.ok) {
      const { token } = await res.json();
      localStorage.setItem('admin_token', token);
      setToken(token);
      loadAll(token);
    } else {
      setLoginError('Wrong password. Try again.');
    }
  }

  function logout() {
    localStorage.removeItem('admin_token');
    setToken(null);
  }

  // ── Artwork form ───────────────────────────────────────────
  function openAddForm() {
    setEditingId(null);
    setForm(emptyForm);
    setImage(null);
    setPreview(null);
    setArtMsg('');
    setShowForm(true);
  }

  function openEditForm(art) {
    setEditingId(art.id);
    setForm({
      title: art.title || '',
      description: art.description || '',
      medium: art.medium || '',
      size: art.size || '',
      price: art.price || '',
      section: art.section || 'shop',
      available: art.available ?? true,
    });
    setImage(null);
    setPreview(art.image_url || null);
    setArtMsg('');
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function cancelForm() {
    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm);
    setImage(null);
    setPreview(null);
    setArtMsg('');
  }

  async function handleSave(e) {
    e.preventDefault();
    if (!form.title.trim()) { setArtMsg('Title is required.'); return; }
    if (!editingId && !image) { setArtMsg('Please select an image.'); return; }

    setSaving(true);
    setArtMsg(image ? 'Uploading image…' : 'Saving…');

    try {
      let image_url = preview; // keep existing if editing without new image
      if (image) {
        setArtMsg('Uploading image…');
        image_url = await uploadImage(image, token);
      }

      setArtMsg('Saving artwork…');
      const method = editingId ? 'PATCH' : 'POST';
      const url = editingId ? `/api/artworks/${editingId}` : '/api/artworks';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ ...form, image_url }),
      });

      if (res.ok) {
        setArtMsg(editingId ? '✓ Artwork updated!' : '✓ Artwork added!');
        fetchArtworks();
        setTimeout(cancelForm, 1200);
      } else {
        const err = await res.json();
        setArtMsg(`Error: ${err.error || 'Try again.'}`);
      }
    } catch (err) {
      setArtMsg(`Error: ${err.message}`);
    }
    setSaving(false);
  }

  async function deleteArtwork(id) {
    if (!confirm('Delete this artwork? This cannot be undone.')) return;
    await fetch(`/api/artworks/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` },
    });
    fetchArtworks();
  }

  async function toggleAvailable(id, current) {
    await fetch(`/api/artworks/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ available: !current }),
    });
    fetchArtworks();
  }

  // ── Site photos ────────────────────────────────────────────
  async function uploadSitePhoto(key, file, setMsg) {
    setUploadingPhoto(key);
    setMsg('Uploading…');
    try {
      const url = await uploadImage(file, token, 'artworks');
      const res = await fetch('/api/site-images', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ key, image_url: url }),
      });
      if (res.ok) {
        setMsg('✓ Photo updated! Refresh the site to see it.');
        setSiteImages(prev => ({ ...prev, [key]: url }));
        if (key === 'hero') { setHeroFile(null); setHeroPreview(null); }
        if (key === 'about') { setAboutFile(null); setAboutPreview(null); }
      } else {
        setMsg('Failed to save. Try again.');
      }
    } catch (err) {
      setMsg(`Error: ${err.message}`);
    }
    setUploadingPhoto('');
  }

  // ── Login screen ───────────────────────────────────────────
  if (!token) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center px-6">
        <div className="w-full max-w-sm">
          <h1 className="text-4xl font-light mb-1" style={{ fontFamily: 'var(--font-cormorant)', color: '#3d6478' }}>
            Admin
          </h1>
          <p className="text-xs text-neutral-400 tracking-wider mb-8">{siteConfig.artistName}</p>
          <form onSubmit={login} className="flex flex-col gap-4">
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="border border-neutral-300 px-4 py-3 text-sm focus:outline-none focus:border-neutral-700"
              autoFocus
            />
            {loginError && <p className="text-red-500 text-xs">{loginError}</p>}
            <button type="submit" className="bg-neutral-900 text-white text-xs tracking-[0.2em] uppercase py-3 hover:bg-neutral-700 transition-colors">
              Enter
            </button>
          </form>
        </div>
      </div>
    );
  }

  // ── Dashboard ──────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-neutral-50">

      {/* Header */}
      <header className="bg-white border-b border-neutral-200 px-6 py-4 flex justify-between items-center sticky top-0 z-20">
        <h1 className="text-xl font-light" style={{ fontFamily: 'var(--font-cormorant)', color: '#3d6478' }}>
          {siteConfig.artistName} — Admin
        </h1>
        <div className="flex gap-6">
          <a href="/" target="_blank" className="text-xs tracking-wider uppercase text-neutral-400 hover:text-neutral-700">
            View Site ↗
          </a>
          <button onClick={logout} className="text-xs tracking-wider uppercase text-neutral-400 hover:text-neutral-700">
            Logout
          </button>
        </div>
      </header>

      {/* Tabs */}
      <div className="bg-white border-b border-neutral-200 px-6 flex gap-8">
        {[['artworks', 'Artworks'], ['photos', 'Site Photos']].map(([key, label]) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`text-xs tracking-[0.2em] uppercase py-4 border-b-2 transition-colors ${
              activeTab === key ? 'border-neutral-900 text-neutral-900' : 'border-transparent text-neutral-400 hover:text-neutral-700'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="max-w-5xl mx-auto px-6 py-12">

        {/* ═══════════════ ARTWORKS TAB ═══════════════ */}
        {activeTab === 'artworks' && (
          <div className="flex flex-col gap-10">

            {/* Add/Edit form */}
            {showForm ? (
              <section className="bg-white border border-neutral-200 p-8">
                <h2 className="text-2xl font-light mb-6" style={{ fontFamily: 'var(--font-cormorant)' }}>
                  {editingId ? 'Edit Artwork' : 'Add New Artwork'}
                </h2>
                <form onSubmit={handleSave} className="grid md:grid-cols-2 gap-8">

                  {/* Image */}
                  <div className="flex flex-col gap-3">
                    <div
                      className="aspect-[4/5] bg-neutral-100 border-2 border-dashed border-neutral-300 flex items-center justify-center cursor-pointer hover:border-neutral-500 transition-colors overflow-hidden"
                      onClick={() => fileRef.current?.click()}
                    >
                      {preview
                        ? <img src={preview} alt="preview" className="w-full h-full object-cover" />
                        : <div className="text-center px-4">
                            <p className="text-neutral-400 text-sm">Click to select photo</p>
                            <p className="text-neutral-300 text-xs mt-1">JPG, PNG</p>
                          </div>
                      }
                    </div>
                    <input ref={fileRef} type="file" accept="image/*" className="hidden"
                      onChange={e => {
                        const f = e.target.files[0];
                        if (!f) return;
                        setImage(f);
                        setPreview(URL.createObjectURL(f));
                      }}
                    />
                    {preview && (
                      <button type="button" className="text-xs text-neutral-400 hover:text-neutral-600"
                        onClick={() => { setImage(null); setPreview(editingId ? null : null); fileRef.current.value = ''; }}>
                        {editingId ? 'Change photo' : 'Remove photo'}
                      </button>
                    )}
                  </div>

                  {/* Fields */}
                  <div className="flex flex-col gap-4">
                    {[
                      { label: 'Title *', key: 'title', placeholder: 'e.g. Morning Light' },
                      { label: 'Medium', key: 'medium', placeholder: 'e.g. Oil on Canvas' },
                      { label: 'Size', key: 'size', placeholder: 'e.g. 24 × 36"' },
                      { label: 'Price', key: 'price', placeholder: 'e.g. PKR 15,000' },
                    ].map(({ label, key, placeholder }) => (
                      <div key={key} className="flex flex-col gap-1">
                        <label className="text-xs tracking-wider uppercase text-neutral-500">{label}</label>
                        <input type="text" value={form[key]} placeholder={placeholder}
                          onChange={e => setForm({ ...form, [key]: e.target.value })}
                          className="border border-neutral-300 px-4 py-2.5 text-sm focus:outline-none focus:border-neutral-700"
                        />
                      </div>
                    ))}

                    {/* Description */}
                    <div className="flex flex-col gap-1">
                      <label className="text-xs tracking-wider uppercase text-neutral-500">Description</label>
                      <textarea value={form.description} rows={3}
                        placeholder="Tell the story behind this piece…"
                        onChange={e => setForm({ ...form, description: e.target.value })}
                        className="border border-neutral-300 px-4 py-2.5 text-sm focus:outline-none focus:border-neutral-700 resize-none"
                      />
                    </div>

                    {/* Section */}
                    <div className="flex flex-col gap-1">
                      <label className="text-xs tracking-wider uppercase text-neutral-500">Section</label>
                      <select value={form.section} onChange={e => setForm({ ...form, section: e.target.value })}
                        className="border border-neutral-300 px-4 py-2.5 text-sm focus:outline-none focus:border-neutral-700 bg-white">
                        <option value="shop">Shop (For Sale)</option>
                        <option value="portfolio">Portfolio</option>
                        <option value="commissions">Commissions</option>
                      </select>
                    </div>

                    <label className="flex items-center gap-3 cursor-pointer">
                      <input type="checkbox" checked={form.available} className="w-4 h-4 accent-neutral-900"
                        onChange={e => setForm({ ...form, available: e.target.checked })} />
                      <span className="text-sm text-neutral-600">Available for sale</span>
                    </label>

                    {artMsg && (
                      <p className={`text-xs ${artMsg.startsWith('✓') ? 'text-green-600' : 'text-neutral-500'}`}>{artMsg}</p>
                    )}

                    <div className="flex gap-3 mt-1">
                      <button type="button" onClick={cancelForm}
                        className="flex-1 border border-neutral-300 text-xs tracking-[0.15em] uppercase py-3 hover:border-neutral-700 transition-colors">
                        Cancel
                      </button>
                      <button type="submit" disabled={saving}
                        className="flex-1 bg-neutral-900 text-white text-xs tracking-[0.15em] uppercase py-3 hover:bg-neutral-700 transition-colors disabled:opacity-40">
                        {saving ? 'Saving…' : editingId ? 'Update Artwork' : 'Save Artwork'}
                      </button>
                    </div>
                  </div>
                </form>
              </section>
            ) : (
              <button onClick={openAddForm}
                className="self-start bg-neutral-900 text-white text-xs tracking-[0.2em] uppercase px-8 py-3.5 hover:bg-neutral-700 transition-colors">
                + Add New Artwork
              </button>
            )}

            {/* Artworks list */}
            <section>
              <h2 className="text-2xl font-light mb-6" style={{ fontFamily: 'var(--font-cormorant)' }}>
                Your Artworks ({artworks.length})
              </h2>

              {artworks.length === 0 ? (
                <p className="text-neutral-400 text-sm">No artworks yet. Add your first one above.</p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                  {artworks.map(art => (
                    <div key={art.id} className="bg-white border border-neutral-200 overflow-hidden">
                      <div className="aspect-[4/5] bg-neutral-100 overflow-hidden relative">
                        <img src={art.image_url} alt={art.title} className="w-full h-full object-cover" />
                        <span className={`absolute top-2 left-2 text-[9px] tracking-widest uppercase px-2 py-0.5 ${
                          art.section === 'portfolio' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'
                        }`}>
                          {art.section || 'shop'}
                        </span>
                      </div>
                      <div className="p-3 flex flex-col gap-2">
                        <p className="text-sm font-medium truncate">{art.title}</p>
                        {art.description && (
                          <p className="text-xs text-neutral-400 truncate">{art.description}</p>
                        )}
                        <p className="text-xs text-neutral-400">{art.price || '—'}</p>
                        <div className="flex items-center gap-2 pt-1 flex-wrap">
                          <button onClick={() => toggleAvailable(art.id, art.available)}
                            className={`text-[10px] px-2 py-1 border transition-colors ${
                              art.available ? 'border-green-300 text-green-700' : 'border-neutral-300 text-neutral-500'
                            }`}>
                            {art.available ? 'Available' : 'Sold'}
                          </button>
                          <button onClick={() => openEditForm(art)}
                            className="text-[10px] px-2 py-1 border border-neutral-300 text-neutral-600 hover:border-neutral-700 transition-colors">
                            Edit
                          </button>
                          <button onClick={() => deleteArtwork(art.id)}
                            className="text-[10px] text-red-400 hover:text-red-600 transition-colors ml-auto">
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        )}

        {/* ═══════════════ SITE PHOTOS TAB ═══════════════ */}
        {activeTab === 'photos' && (
          <div className="flex flex-col gap-10">
            <h2 className="text-2xl font-light" style={{ fontFamily: 'var(--font-cormorant)' }}>
              Site Photos
            </h2>
            <p className="text-sm text-neutral-500 -mt-6">
              Change the main photos shown on your website.
            </p>

            {[
              { key: 'hero', label: 'Hero Photo', desc: 'The large background image on your homepage', file: heroFile, setFile: setHeroFile, previewState: heroPreview, setPreview: setHeroPreview, ref: heroRef },
              { key: 'about', label: 'About Photo', desc: 'Your photo shown in the About section', file: aboutFile, setFile: setAboutFile, previewState: aboutPreview, setPreview: setAboutPreview, ref: aboutRef },
            ].map(({ key, label, desc, file, setFile, previewState, setPreview: setP, ref }) => (
              <div key={key} className="bg-white border border-neutral-200 p-8">
                <h3 className="text-lg font-light mb-1" style={{ fontFamily: 'var(--font-cormorant)' }}>{label}</h3>
                <p className="text-xs text-neutral-400 mb-6">{desc}</p>

                <div className="grid md:grid-cols-2 gap-8 items-start">
                  {/* Current */}
                  <div className="flex flex-col gap-2">
                    <p className="text-xs tracking-wider uppercase text-neutral-400">Current</p>
                    <div className="aspect-[4/3] bg-neutral-100 overflow-hidden">
                      {siteImages[key]
                        ? <img src={siteImages[key]} alt={label} className="w-full h-full object-cover" />
                        : <div className="w-full h-full flex items-center justify-center text-neutral-300 text-xs tracking-widest uppercase">No photo yet</div>
                      }
                    </div>
                  </div>

                  {/* New */}
                  <div className="flex flex-col gap-3">
                    <p className="text-xs tracking-wider uppercase text-neutral-400">Upload New</p>
                    <div
                      className="aspect-[4/3] bg-neutral-100 border-2 border-dashed border-neutral-300 flex items-center justify-center cursor-pointer hover:border-neutral-500 transition-colors overflow-hidden"
                      onClick={() => ref.current?.click()}
                    >
                      {previewState
                        ? <img src={previewState} alt="preview" className="w-full h-full object-cover" />
                        : <p className="text-neutral-400 text-sm">Click to select photo</p>
                      }
                    </div>
                    <input ref={ref} type="file" accept="image/*" className="hidden"
                      onChange={e => {
                        const f = e.target.files[0];
                        if (!f) return;
                        setFile(f);
                        setP(URL.createObjectURL(f));
                      }}
                    />
                    {file && (
                      <button
                        onClick={() => uploadSitePhoto(key, file, setPhotoMsg)}
                        disabled={uploadingPhoto === key}
                        className="bg-neutral-900 text-white text-xs tracking-[0.2em] uppercase py-3 hover:bg-neutral-700 transition-colors disabled:opacity-40"
                      >
                        {uploadingPhoto === key ? 'Uploading…' : `Save ${label}`}
                      </button>
                    )}
                  </div>
                </div>

                {photoMsg && (
                  <p className={`mt-4 text-xs ${photoMsg.startsWith('✓') ? 'text-green-600' : 'text-neutral-500'}`}>
                    {photoMsg}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
}
