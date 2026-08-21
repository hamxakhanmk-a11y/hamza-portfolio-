'use client';

import { useState, useEffect, useRef } from 'react';
import { siteConfig } from '@/data/config';
import ImageCropper from '@/components/ImageCropper';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;

// ── Image compression ──────────────────────────────────────────
async function prepareImage(file) {
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
      const preserveTransparency = file.type === 'image/png';
      canvas.toBlob(blob => {
        resolve(new File([blob], preserveTransparency ? 'image.png' : 'image.jpg', { type: preserveTransparency ? 'image/png' : 'image/jpeg' }));
        URL.revokeObjectURL(url);
      }, preserveTransparency ? 'image/png' : 'image/jpeg', 0.9);
    };
    img.src = url;
  });
}

// ── Upload with client-side compression ───────────────────────
async function uploadImage(file, token, bucket = 'artworks') {
  const compressed = await prepareImage(file);

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
  section: 'portfolio', available: true,
};

const emptyShow = {
  title: '', description: '', location: '', date: '', cover_image: '',
};

export default function AdminPage() {
  const [token, setToken] = useState(() => typeof window === 'undefined' ? null : localStorage.getItem('admin_token'));
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

  // Multiple images per artwork
  const [artworkImages, setArtworkImages] = useState([]);
  const [addingImage, setAddingImage] = useState(false);

  // About section state
  const [siteText, setSiteText] = useState({ bio: '', artist_statement: '' });
  const [aboutImages, setAboutImages] = useState([]);
  const [addingAboutImage, setAddingAboutImage] = useState(false);
  const [aboutMsg, setAboutMsg] = useState('');
  const [savingText, setSavingText] = useState('');

  // Shows state
  const [shows, setShows] = useState([]);
  const [showFormOpen, setShowFormOpen] = useState(false);
  const [editingShowId, setEditingShowId] = useState(null);
  const [showData, setShowData] = useState(emptyShow);
  const [showCover, setShowCover] = useState(null);
  const [showCoverPreview, setShowCoverPreview] = useState(null);
  const [showImages, setShowImages] = useState([]);
  const [showMsg, setShowMsg] = useState('');
  const [savingShow, setSavingShow] = useState(false);
  const [addingShowImage, setAddingShowImage] = useState(false);
  const showCoverRef = useRef(null);
  const [cropTask, setCropTask] = useState(null);

  function chooseImage(file, options) {
    if (!file) return;
    setCropTask({ file, ...options });
  }

  async function adjustStoredImage({ url, aspect = 1, allowAspect = true, removeWhite = false, setMessage, save }) {
    if (!url) return;
    setMessage?.('Loading current photo…');
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error('Could not load the current photo.');
      const blob = await response.blob();
      const extension = blob.type === 'image/png' ? 'png' : 'jpg';
      const file = new File([blob], `current-photo.${extension}`, { type: blob.type || 'image/jpeg' });
      chooseImage(file, {
        aspect,
        allowAspect,
        removeWhite,
        onComplete: async edited => {
          setMessage?.('Saving adjusted photo…');
          try {
            const imageUrl = await uploadImage(edited, token);
            await save(imageUrl);
            setMessage?.('✓ Adjusted photo saved!');
          } catch (error) {
            setMessage?.(`Error: ${error.message}`);
          }
        },
      });
      setMessage?.('');
    } catch (error) {
      setMessage?.(`Error: ${error.message}`);
    }
  }

  async function loadAll(t) {
    await Promise.all([fetchArtworks(), fetchSiteImages(), fetchSiteText(), fetchAboutImages(), fetchShows()]);
  }

  // ── Shows functions ────────────────────────────────────────
  async function fetchShows() {
    const res = await fetch('/api/shows');
    const data = await res.json();
    setShows(Array.isArray(data) ? data : []);
  }

  async function fetchShowImages(showId) {
    if (!showId) return;
    const res = await fetch(`/api/shows/${showId}/images`);
    const data = await res.json();
    setShowImages(Array.isArray(data) ? data : []);
  }

  function openAddShow() {
    setEditingShowId(null);
    setShowData(emptyShow);
    setShowCover(null);
    setShowCoverPreview(null);
    setShowImages([]);
    setShowMsg('');
    setShowFormOpen(true);
  }

  function openEditShow(show) {
    setEditingShowId(show.id);
    setShowData({
      title: show.title || '',
      description: show.description || '',
      location: show.location || '',
      date: show.date || '',
      cover_image: show.cover_image || '',
    });
    setShowCover(null);
    setShowCoverPreview(show.cover_image || null);
    setShowMsg('');
    setShowFormOpen(true);
    fetchShowImages(show.id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function cancelShowForm() {
    setShowFormOpen(false);
    setEditingShowId(null);
    setShowData(emptyShow);
    setShowCover(null);
    setShowCoverPreview(null);
    setShowImages([]);
    setShowMsg('');
  }

  async function saveShow(e) {
    e.preventDefault();
    if (!showData.title.trim()) { setShowMsg('Title is required.'); return; }
    setSavingShow(true);
    setShowMsg('Saving…');
    try {
      let cover_image = showData.cover_image;
      if (showCover) {
        setShowMsg('Uploading cover…');
        cover_image = await uploadImage(showCover, token);
      }
      const method = editingShowId ? 'PATCH' : 'POST';
      const url = editingShowId ? `/api/shows/${editingShowId}` : '/api/shows';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ ...showData, cover_image }),
      });
      if (res.ok) {
        const saved = await res.json();
        setShowMsg(editingShowId ? '✓ Show updated!' : '✓ Show added!');
        fetchShows();
        if (!editingShowId) {
          // switch to edit mode so user can add photos
          setEditingShowId(saved.id);
          setShowData({ ...showData, cover_image });
          setShowCover(null);
          setShowCoverPreview(cover_image);
        }
      } else {
        const err = await res.json();
        setShowMsg(`Error: ${err.error || 'Try again.'}`);
      }
    } catch (err) {
      setShowMsg(`Error: ${err.message}`);
    }
    setSavingShow(false);
  }

  async function deleteShow(id) {
    if (!confirm('Delete this show and all its photos? This cannot be undone.')) return;
    await fetch(`/api/shows/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` },
    });
    fetchShows();
  }

  async function addShowImage(file, caption = '') {
    if (!editingShowId) return;
    setAddingShowImage(true);
    try {
      const url = await uploadImage(file, token);
      const res = await fetch(`/api/shows/${editingShowId}/images`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ image_url: url, caption }),
      });
      if (res.ok) fetchShowImages(editingShowId);
      else setShowMsg('Failed to add photo.');
    } catch (err) {
      setShowMsg(`Error: ${err.message}`);
    }
    setAddingShowImage(false);
  }

  async function deleteShowImage(id) {
    await fetch(`/api/show-images/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` },
    });
    fetchShowImages(editingShowId);
  }

  async function fetchSiteText() {
    const res = await fetch('/api/site-text');
    const data = await res.json();
    if (!res.ok) {
      setAboutMsg(`Error loading text: ${data.error || 'Please refresh.'}`);
      return;
    }
    setSiteText({
      bio: '',
      artist_statement: '',
      contact_whatsapp: '',
      contact_email: '',
      contact_instagram: '',
      contact_intro: '',
      ...data,
    });
  }

  async function fetchAboutImages() {
    const res = await fetch('/api/about-images');
    const data = await res.json();
    setAboutImages(Array.isArray(data) ? data : []);
  }

  async function saveSiteText(key) {
    setSavingText(key);
    setAboutMsg('');
    const res = await fetch('/api/site-text', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ key, value: siteText[key] }),
    });
    if (res.ok) setAboutMsg(`✓ ${key === 'bio' ? 'Bio' : key === 'artist_statement' ? 'Artist Statement' : 'Contact detail'} saved!`);
    else {
      const error = await res.json().catch(() => ({}));
      setAboutMsg(`Error: ${error.error || 'Failed to save.'}`);
    }
    setSavingText('');
  }

  async function addAboutImage(file) {
    setAddingAboutImage(true);
    setAboutMsg('Uploading photo…');
    try {
      const url = await uploadImage(file, token);
      const res = await fetch('/api/about-images', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ image_url: url }),
      });
      if (res.ok) {
        setAboutMsg('✓ Photo added!');
        fetchAboutImages();
      } else {
        const error = await res.json().catch(() => ({}));
        setAboutMsg(`Error: ${error.error || 'Failed to add photo.'}`);
      }
    } catch (err) {
      setAboutMsg(`Error: ${err.message}`);
    }
    setAddingAboutImage(false);
  }

  async function deleteAboutImage(id) {
    if (!confirm('Delete this photo?')) return;
    await fetch(`/api/about-images/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` },
    });
    fetchAboutImages();
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

  useEffect(() => {
    if (token) void loadAll(token);
    // The data loaders are stable page functions and only need to run when the session changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

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
    fetchArtworkImages(art.id);
  }

  function cancelForm() {
    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm);
    setImage(null);
    setPreview(null);
    setArtMsg('');
    setArtworkImages([]);
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

  // ── Extra artwork images ───────────────────────────────────
  async function fetchArtworkImages(artworkId) {
    if (!artworkId) return;
    const res = await fetch(`/api/artworks/${artworkId}/images`);
    const data = await res.json();
    setArtworkImages(Array.isArray(data) ? data : []);
  }

  async function addArtworkImage(file) {
    if (!editingId) return;
    setAddingImage(true);
    try {
      const url = await uploadImage(file, token);
      const res = await fetch(`/api/artworks/${editingId}/images`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ image_url: url }),
      });
      if (res.ok) fetchArtworkImages(editingId);
      else setArtMsg('Failed to add photo. Try again.');
    } catch (err) {
      setArtMsg(`Error: ${err.message}`);
    }
    setAddingImage(false);
  }

  async function deleteArtworkImage(imageId) {
    await fetch(`/api/artwork-images/${imageId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` },
    });
    fetchArtworkImages(editingId);
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
        const error = await res.json().catch(() => ({}));
        setMsg(`Error: ${error.error || 'Failed to save.'}`);
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

      {cropTask && (
        <ImageCropper
          file={cropTask.file}
          aspect={cropTask.aspect || 1}
          allowAspect={cropTask.allowAspect || false}
          removeWhite={cropTask.removeWhite || false}
          onCancel={() => setCropTask(null)}
          onApply={editedFile => {
            cropTask.onComplete(editedFile);
            setCropTask(null);
          }}
        />
      )}

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
        {[['artworks', 'Artworks'], ['shows', 'Shows'], ['about', 'About'], ['contact', 'Contact'], ['photos', 'Site Photos']].map(([key, label]) => (
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
                        chooseImage(f, {
                          aspect: 1,
                          allowAspect: true,
                          removeWhite: true,
                          onComplete: edited => {
                            setImage(edited);
                            setPreview(URL.createObjectURL(edited));
                          },
                        });
                        e.target.value = '';
                      }}
                    />
                    {preview && (
                      <div className="flex justify-center gap-5">
                        {editingId && !image && (
                          <button type="button" className="text-xs text-neutral-600 underline underline-offset-4"
                            onClick={() => adjustStoredImage({
                              url: preview,
                              aspect: 1,
                              allowAspect: true,
                              removeWhite: true,
                              setMessage: setArtMsg,
                              save: async imageUrl => {
                                const response = await fetch(`/api/artworks/${editingId}`, {
                                  method: 'PATCH',
                                  headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                                  body: JSON.stringify({ image_url: imageUrl }),
                                });
                                if (!response.ok) throw new Error((await response.json()).error || 'Could not update artwork.');
                                setPreview(imageUrl);
                                await fetchArtworks();
                              },
                            })}>
                            Adjust Current Photo
                          </button>
                        )}
                        <button type="button" className="text-xs text-neutral-400 hover:text-neutral-600"
                          onClick={() => fileRef.current?.click()}>
                          Choose Different Photo
                        </button>
                      </div>
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

                {/* Additional Photos — only when editing an existing artwork */}
                {editingId && (
                  <div className="mt-8 border-t border-neutral-200 pt-8">
                    <h3 className="text-lg font-light mb-1" style={{ fontFamily: 'var(--font-cormorant)' }}>
                      Additional Photos
                    </h3>
                    <p className="text-xs text-neutral-400 mb-6">
                      Process shots, detail views, different angles — visitors can click through all images on the artwork page.
                    </p>
                    <div className="flex gap-3 flex-wrap items-start">
                      {artworkImages.map(img => (
                        <div key={img.id} className="relative group/img">
                          <img src={img.image_url} alt="extra" className="w-24 h-24 object-cover" />
                          <button
                            type="button"
                            onClick={() => adjustStoredImage({
                              url: img.image_url,
                              aspect: 1,
                              allowAspect: true,
                              setMessage: setArtMsg,
                              save: async imageUrl => {
                                const response = await fetch(`/api/artwork-images/${img.id}`, {
                                  method: 'PATCH',
                                  headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                                  body: JSON.stringify({ image_url: imageUrl }),
                                });
                                if (!response.ok) throw new Error((await response.json()).error || 'Could not update photo.');
                                await fetchArtworkImages(editingId);
                              },
                            })}
                            className="absolute bottom-1 left-1 bg-white/95 text-neutral-800 text-[9px] px-2 py-1 shadow"
                          >
                            Adjust
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteArtworkImage(img.id)}
                            className="absolute top-1 right-1 bg-neutral-900/80 text-white text-[10px] w-5 h-5 flex items-center justify-center opacity-0 group-hover/img:opacity-100 transition-opacity"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                      <label
                        className={`w-24 h-24 border-2 border-dashed border-neutral-300 flex flex-col items-center justify-center cursor-pointer hover:border-neutral-500 transition-colors ${addingImage ? 'opacity-40 pointer-events-none' : ''}`}
                      >
                        <span className="text-2xl text-neutral-400 leading-none">+</span>
                        <span className="text-[10px] text-neutral-400 mt-1.5 tracking-wider">
                          {addingImage ? 'Uploading…' : 'Add Photo'}
                        </span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={e => {
                            const f = e.target.files[0];
                            if (f) chooseImage(f, { aspect: 1, allowAspect: true, onComplete: addArtworkImage });
                            e.target.value = '';
                          }}
                        />
                      </label>
                    </div>
                  </div>
                )}
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

        {/* ═══════════════ SHOWS TAB ═══════════════ */}
        {activeTab === 'shows' && (
          <div className="flex flex-col gap-10">

            {/* Add/Edit form */}
            {showFormOpen ? (
              <section className="bg-white border border-neutral-200 p-8">
                <h2 className="text-2xl font-light mb-6" style={{ fontFamily: 'var(--font-cormorant)' }}>
                  {editingShowId ? 'Edit Show' : 'Add New Show'}
                </h2>
                <form onSubmit={saveShow} className="grid md:grid-cols-2 gap-8">

                  {/* Cover image */}
                  <div className="flex flex-col gap-3">
                    <label className="text-xs tracking-wider uppercase text-neutral-500">Cover Photo</label>
                    <div
                      className="aspect-[4/3] bg-neutral-100 border-2 border-dashed border-neutral-300 flex items-center justify-center cursor-pointer hover:border-neutral-500 transition-colors overflow-hidden"
                      onClick={() => showCoverRef.current?.click()}
                    >
                      {showCoverPreview
                        ? <img src={showCoverPreview} alt="cover preview" className="w-full h-full object-cover" />
                        : <p className="text-neutral-400 text-sm">Click to select cover photo</p>
                      }
                    </div>
                    <input ref={showCoverRef} type="file" accept="image/*" className="hidden"
                      onChange={e => {
                        const f = e.target.files[0];
                        if (!f) return;
                        chooseImage(f, {
                          aspect: 4 / 3,
                          allowAspect: true,
                          onComplete: edited => {
                            setShowCover(edited);
                            setShowCoverPreview(URL.createObjectURL(edited));
                          },
                        });
                        e.target.value = '';
                      }}
                    />
                    {editingShowId && showCoverPreview && !showCover && (
                      <button type="button" className="text-xs text-neutral-600 underline underline-offset-4"
                        onClick={() => adjustStoredImage({
                          url: showCoverPreview,
                          aspect: 4 / 3,
                          allowAspect: true,
                          setMessage: setShowMsg,
                          save: async imageUrl => {
                            const response = await fetch(`/api/shows/${editingShowId}`, {
                              method: 'PATCH',
                              headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                              body: JSON.stringify({ cover_image: imageUrl }),
                            });
                            if (!response.ok) throw new Error((await response.json()).error || 'Could not update cover.');
                            setShowCoverPreview(imageUrl);
                            setShowData(current => ({ ...current, cover_image: imageUrl }));
                            await fetchShows();
                          },
                        })}>
                        Adjust Current Cover
                      </button>
                    )}
                  </div>

                  {/* Fields */}
                  <div className="flex flex-col gap-4">
                    <div className="flex flex-col gap-1">
                      <label className="text-xs tracking-wider uppercase text-neutral-500">Title *</label>
                      <input type="text" value={showData.title}
                        placeholder="e.g. Group Show at Karachi Arts Council"
                        onChange={e => setShowData({ ...showData, title: e.target.value })}
                        className="border border-neutral-300 px-4 py-2.5 text-sm focus:outline-none focus:border-neutral-700"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-xs tracking-wider uppercase text-neutral-500">Date</label>
                      <input type="text" value={showData.date}
                        placeholder="e.g. March 2024"
                        onChange={e => setShowData({ ...showData, date: e.target.value })}
                        className="border border-neutral-300 px-4 py-2.5 text-sm focus:outline-none focus:border-neutral-700"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-xs tracking-wider uppercase text-neutral-500">Location</label>
                      <input type="text" value={showData.location}
                        placeholder="e.g. Karachi, Pakistan"
                        onChange={e => setShowData({ ...showData, location: e.target.value })}
                        className="border border-neutral-300 px-4 py-2.5 text-sm focus:outline-none focus:border-neutral-700"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-xs tracking-wider uppercase text-neutral-500">Description</label>
                      <textarea value={showData.description} rows={4}
                        placeholder="What was the show about? Which pieces were featured? How did it go?"
                        onChange={e => setShowData({ ...showData, description: e.target.value })}
                        className="border border-neutral-300 px-4 py-2.5 text-sm focus:outline-none focus:border-neutral-700 resize-none"
                      />
                    </div>

                    {showMsg && (
                      <p className={`text-xs ${showMsg.startsWith('✓') ? 'text-green-600' : 'text-neutral-500'}`}>{showMsg}</p>
                    )}

                    <div className="flex gap-3 mt-1">
                      <button type="button" onClick={cancelShowForm}
                        className="flex-1 border border-neutral-300 text-xs tracking-[0.15em] uppercase py-3 hover:border-neutral-700 transition-colors">
                        {editingShowId ? 'Done' : 'Cancel'}
                      </button>
                      <button type="submit" disabled={savingShow}
                        className="flex-1 bg-neutral-900 text-white text-xs tracking-[0.15em] uppercase py-3 hover:bg-neutral-700 transition-colors disabled:opacity-40">
                        {savingShow ? 'Saving…' : editingShowId ? 'Update Show' : 'Save Show'}
                      </button>
                    </div>
                  </div>
                </form>

                {/* Show gallery photos — only after show exists */}
                {editingShowId && (
                  <div className="mt-8 border-t border-neutral-200 pt-8">
                    <h3 className="text-lg font-light mb-1" style={{ fontFamily: 'var(--font-cormorant)' }}>
                      Show Photos
                    </h3>
                    <p className="text-xs text-neutral-400 mb-6">
                      Add photos from the show — installation shots, your paintings on the wall, event pics.
                    </p>
                    <div className="flex gap-3 flex-wrap items-start">
                      {showImages.map(img => (
                        <div key={img.id} className="relative group/img">
                          <img src={img.image_url} alt="show" className="w-28 h-28 object-cover" />
                          <button
                            type="button"
                            onClick={() => adjustStoredImage({
                              url: img.image_url,
                              aspect: 4 / 3,
                              allowAspect: true,
                              setMessage: setShowMsg,
                              save: async imageUrl => {
                                const response = await fetch(`/api/show-images/${img.id}`, {
                                  method: 'PATCH',
                                  headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                                  body: JSON.stringify({ image_url: imageUrl }),
                                });
                                if (!response.ok) throw new Error((await response.json()).error || 'Could not update show photo.');
                                await fetchShowImages(editingShowId);
                              },
                            })}
                            className="absolute bottom-1 left-1 bg-white/95 text-neutral-800 text-[9px] px-2 py-1 shadow"
                          >
                            Adjust
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteShowImage(img.id)}
                            className="absolute top-1 right-1 bg-neutral-900/80 text-white text-[10px] w-5 h-5 flex items-center justify-center opacity-0 group-hover/img:opacity-100 transition-opacity"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                      <label className={`w-28 h-28 border-2 border-dashed border-neutral-300 flex flex-col items-center justify-center cursor-pointer hover:border-neutral-500 transition-colors ${addingShowImage ? 'opacity-40 pointer-events-none' : ''}`}>
                        <span className="text-2xl text-neutral-400 leading-none">+</span>
                        <span className="text-[10px] text-neutral-400 mt-1.5 tracking-wider">
                          {addingShowImage ? 'Uploading…' : 'Add Photo'}
                        </span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={e => {
                            const f = e.target.files[0];
                            if (f) chooseImage(f, { aspect: 4 / 3, allowAspect: true, onComplete: addShowImage });
                            e.target.value = '';
                          }}
                        />
                      </label>
                    </div>
                  </div>
                )}
              </section>
            ) : (
              <button onClick={openAddShow}
                className="self-start bg-neutral-900 text-white text-xs tracking-[0.2em] uppercase px-8 py-3.5 hover:bg-neutral-700 transition-colors">
                + Add New Show
              </button>
            )}

            {/* Shows list */}
            <section>
              <h2 className="text-2xl font-light mb-6" style={{ fontFamily: 'var(--font-cormorant)' }}>
                Your Shows ({shows.length})
              </h2>
              {shows.length === 0 ? (
                <p className="text-neutral-400 text-sm">No shows yet. Add your first one above.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {shows.map(show => (
                    <div key={show.id} className="bg-white border border-neutral-200 overflow-hidden flex flex-col">
                      <div className="aspect-[4/3] bg-neutral-100 overflow-hidden">
                        {show.cover_image ? (
                          <img src={show.cover_image} alt={show.title} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-neutral-300 text-xs tracking-widest uppercase">No cover</div>
                        )}
                      </div>
                      <div className="p-3 flex flex-col gap-1 flex-1">
                        <p className="text-sm font-medium truncate">{show.title}</p>
                        <p className="text-xs text-neutral-400">
                          {[show.date, show.location].filter(Boolean).join(' · ') || '—'}
                        </p>
                        <div className="flex items-center gap-2 pt-2 mt-auto">
                          <button onClick={() => openEditShow(show)}
                            className="text-[10px] px-3 py-1 border border-neutral-300 text-neutral-600 hover:border-neutral-700 transition-colors">
                            Edit
                          </button>
                          <button onClick={() => deleteShow(show.id)}
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

        {/* ═══════════════ ABOUT TAB ═══════════════ */}
        {activeTab === 'about' && (
          <div className="flex flex-col gap-10">
            <div>
              <h2 className="text-2xl font-light" style={{ fontFamily: 'var(--font-cormorant)' }}>
                About Section
              </h2>
              <p className="text-sm text-neutral-500 mt-1">
                Edit your bio, artist statement, and the photos shown on your About page.
              </p>
            </div>

            {aboutMsg && (
              <p className={`text-xs ${aboutMsg.startsWith('✓') ? 'text-green-600' : 'text-neutral-500'}`}>
                {aboutMsg}
              </p>
            )}

            {/* Bio */}
            <section className="bg-white border border-neutral-200 p-8">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-light" style={{ fontFamily: 'var(--font-cormorant)' }}>Bio</h3>
                <button
                  onClick={() => saveSiteText('bio')}
                  disabled={savingText === 'bio'}
                  className="bg-neutral-900 text-white text-[11px] tracking-[0.2em] uppercase px-5 py-2 hover:bg-neutral-700 transition-colors disabled:opacity-40"
                >
                  {savingText === 'bio' ? 'Saving…' : 'Save Bio'}
                </button>
              </div>
              <textarea
                value={siteText.bio}
                onChange={e => setSiteText({ ...siteText, bio: e.target.value })}
                rows={6}
                placeholder="Tell visitors about yourself — where you're from, when you started painting, what draws you to art…"
                className="w-full border border-neutral-300 px-4 py-3 text-sm focus:outline-none focus:border-neutral-700 resize-y leading-relaxed"
              />
              <p className="text-[11px] text-neutral-400 mt-2">Press Enter for new paragraphs.</p>
            </section>

            {/* Artist Statement */}
            <section className="bg-white border border-neutral-200 p-8">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-light" style={{ fontFamily: 'var(--font-cormorant)' }}>Artist Statement</h3>
                <button
                  onClick={() => saveSiteText('artist_statement')}
                  disabled={savingText === 'artist_statement'}
                  className="bg-neutral-900 text-white text-[11px] tracking-[0.2em] uppercase px-5 py-2 hover:bg-neutral-700 transition-colors disabled:opacity-40"
                >
                  {savingText === 'artist_statement' ? 'Saving…' : 'Save Statement'}
                </button>
              </div>
              <textarea
                value={siteText.artist_statement}
                onChange={e => setSiteText({ ...siteText, artist_statement: e.target.value })}
                rows={6}
                placeholder="Your artistic vision — what your work is about, the themes and ideas that drive it…"
                className="w-full border border-neutral-300 px-4 py-3 text-sm focus:outline-none focus:border-neutral-700 resize-y leading-relaxed"
              />
            </section>

            {/* About Photos */}
            <section className="bg-white border border-neutral-200 p-8">
              <h3 className="text-lg font-light mb-1" style={{ fontFamily: 'var(--font-cormorant)' }}>About Photos</h3>
              <p className="text-xs text-neutral-400 mb-6">
                Photos of you, your studio, or your process — shown on the About page.
              </p>
              <div className="flex gap-4 flex-wrap items-start">
                {aboutImages.map(img => (
                  <div key={img.id} className="relative group/img">
                    <img src={img.image_url} alt="about" className="w-32 h-32 object-cover" />
                    <button
                      type="button"
                      onClick={() => adjustStoredImage({
                        url: img.image_url,
                        aspect: 4 / 5,
                        allowAspect: true,
                        setMessage: setAboutMsg,
                        save: async imageUrl => {
                          const response = await fetch(`/api/about-images/${img.id}`, {
                            method: 'PATCH',
                            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                            body: JSON.stringify({ image_url: imageUrl }),
                          });
                          if (!response.ok) throw new Error((await response.json()).error || 'Could not update About photo.');
                          await fetchAboutImages();
                        },
                      })}
                      className="absolute bottom-1 left-1 bg-white/95 text-neutral-800 text-[9px] px-2 py-1 shadow"
                    >
                      Adjust
                    </button>
                    <button
                      onClick={() => deleteAboutImage(img.id)}
                      className="absolute top-1 right-1 bg-neutral-900/80 text-white text-[10px] w-6 h-6 flex items-center justify-center opacity-0 group-hover/img:opacity-100 transition-opacity"
                    >
                      ✕
                    </button>
                  </div>
                ))}
                <label className={`w-32 h-32 border-2 border-dashed border-neutral-300 flex flex-col items-center justify-center cursor-pointer hover:border-neutral-500 transition-colors ${addingAboutImage ? 'opacity-40 pointer-events-none' : ''}`}>
                  <span className="text-3xl text-neutral-400 leading-none">+</span>
                  <span className="text-[10px] text-neutral-400 mt-2 tracking-wider">
                    {addingAboutImage ? 'Uploading…' : 'Add Photo'}
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={e => {
                      const f = e.target.files[0];
                      if (f) chooseImage(f, { aspect: 4 / 5, onComplete: addAboutImage });
                      e.target.value = '';
                    }}
                  />
                </label>
              </div>
            </section>
          </div>
        )}

        {/* ═══════════════ CONTACT TAB ═══════════════ */}
        {activeTab === 'contact' && (
          <div className="flex flex-col gap-8 max-w-2xl">
            <div>
              <h2 className="text-2xl font-light" style={{ fontFamily: 'var(--font-cormorant)' }}>
                Contact Details
              </h2>
              <p className="text-sm text-neutral-500 mt-1">
                These show up on your Contact page and the &quot;Inquire&quot; buttons on artworks.
              </p>
            </div>

            {aboutMsg && (
              <p className={`text-xs ${aboutMsg.startsWith('✓') ? 'text-green-600' : 'text-neutral-500'}`}>
                {aboutMsg}
              </p>
            )}

            {[
              { key: 'contact_whatsapp', label: 'WhatsApp Number', placeholder: '923001234567', hint: 'Country code + number, no spaces or + sign' },
              { key: 'contact_email', label: 'Email', placeholder: 'you@example.com' },
              { key: 'contact_instagram', label: 'Instagram Username', placeholder: 'yourusername', hint: 'Without the @' },
            ].map(({ key, label, placeholder, hint }) => (
              <div key={key} className="bg-white border border-neutral-200 p-6 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs tracking-wider uppercase text-neutral-500">{label}</label>
                  <button
                    onClick={() => saveSiteText(key)}
                    disabled={savingText === key}
                    className="bg-neutral-900 text-white text-[11px] tracking-[0.2em] uppercase px-5 py-2 hover:bg-neutral-700 transition-colors disabled:opacity-40"
                  >
                    {savingText === key ? 'Saving…' : 'Save'}
                  </button>
                </div>
                <input
                  type="text"
                  value={siteText[key] || ''}
                  placeholder={placeholder}
                  onChange={e => setSiteText({ ...siteText, [key]: e.target.value })}
                  className="border border-neutral-300 px-4 py-2.5 text-sm focus:outline-none focus:border-neutral-700"
                />
                {hint && <p className="text-[11px] text-neutral-400">{hint}</p>}
              </div>
            ))}

            <div className="bg-white border border-neutral-200 p-6 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <label className="text-xs tracking-wider uppercase text-neutral-500">Contact Page Intro</label>
                <button
                  onClick={() => saveSiteText('contact_intro')}
                  disabled={savingText === 'contact_intro'}
                  className="bg-neutral-900 text-white text-[11px] tracking-[0.2em] uppercase px-5 py-2 hover:bg-neutral-700 transition-colors disabled:opacity-40"
                >
                  {savingText === 'contact_intro' ? 'Saving…' : 'Save'}
                </button>
              </div>
              <textarea
                rows={3}
                value={siteText.contact_intro || ''}
                placeholder="Interested in a piece? Have a commission in mind? Reach out — I'd love to hear from you."
                onChange={e => setSiteText({ ...siteText, contact_intro: e.target.value })}
                className="border border-neutral-300 px-4 py-2.5 text-sm focus:outline-none focus:border-neutral-700 resize-y"
              />
            </div>
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
                    {siteImages[key] && (
                      <button type="button" className="self-start text-xs text-neutral-600 underline underline-offset-4"
                        onClick={() => adjustStoredImage({
                          url: siteImages[key],
                          aspect: key === 'hero' ? 16 / 9 : 4 / 5,
                          allowAspect: false,
                          setMessage: setPhotoMsg,
                          save: async imageUrl => {
                            const response = await fetch('/api/site-images', {
                              method: 'PUT',
                              headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                              body: JSON.stringify({ key, image_url: imageUrl }),
                            });
                            if (!response.ok) throw new Error((await response.json()).error || 'Could not update site photo.');
                            setSiteImages(current => ({ ...current, [key]: imageUrl }));
                          },
                        })}>
                        Adjust Current Photo
                      </button>
                    )}
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
                        chooseImage(f, {
                          aspect: key === 'hero' ? 16 / 9 : 4 / 5,
                          onComplete: edited => {
                            setFile(edited);
                            setP(URL.createObjectURL(edited));
                          },
                        });
                        e.target.value = '';
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
