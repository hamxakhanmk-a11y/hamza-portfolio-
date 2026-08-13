'use client';

import { useState, useEffect, useRef } from 'react';
import { siteConfig } from '@/data/config';

export default function AdminPage() {
  const [token, setToken] = useState(null);
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [artworks, setArtworks] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState('');
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState(null);
  const [form, setForm] = useState({ title: '', medium: '', size: '', price: '', available: true });
  const fileRef = useRef(null);

  useEffect(() => {
    const t = localStorage.getItem('admin_token');
    if (t) { setToken(t); fetchArtworks(); }
  }, []);

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
      fetchArtworks();
    } else {
      setLoginError('Wrong password. Try again.');
    }
  }

  async function fetchArtworks() {
    const res = await fetch('/api/artworks');
    const data = await res.json();
    setArtworks(Array.isArray(data) ? data : []);
  }

  function handleImageChange(e) {
    const file = e.target.files[0];
    if (!file) return;
    setImage(file);
    setPreview(URL.createObjectURL(file));
  }

  function resetForm() {
    setImage(null);
    setPreview(null);
    setForm({ title: '', medium: '', size: '', price: '', available: true });
    if (fileRef.current) fileRef.current.value = '';
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!image) { setMessage('Please select an image.'); return; }
    if (!form.title.trim()) { setMessage('Title is required.'); return; }

    setUploading(true);
    setMessage('Uploading image…');

    const fd = new FormData();
    fd.append('file', image);

    const uploadRes = await fetch('/api/admin/upload', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: fd,
    });

    if (!uploadRes.ok) {
      setMessage('Image upload failed. Try again.');
      setUploading(false);
      return;
    }

    const { url } = await uploadRes.json();
    setMessage('Saving artwork…');

    const saveRes = await fetch('/api/artworks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ ...form, image_url: url }),
    });

    if (saveRes.ok) {
      setMessage('✓ Artwork added successfully!');
      resetForm();
      fetchArtworks();
    } else {
      setMessage('Failed to save. Try again.');
    }
    setUploading(false);
  }

  async function deleteArtwork(id) {
    if (!confirm('Delete this artwork? This cannot be undone.')) return;
    await fetch(`/api/artworks/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    fetchArtworks();
  }

  async function toggleAvailable(id, current) {
    await fetch(`/api/artworks/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ available: !current }),
    });
    fetchArtworks();
  }

  function logout() {
    localStorage.removeItem('admin_token');
    setToken(null);
    setArtworks([]);
  }

  // ── Login screen ──────────────────────────────────────────────
  if (!token) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center px-6">
        <div className="w-full max-w-sm">
          <h1
            className="text-4xl font-light mb-2 tracking-wide text-neutral-900"
            style={{ fontFamily: 'var(--font-cormorant)' }}
          >
            Admin
          </h1>
          <p className="text-xs text-neutral-400 tracking-wider mb-8">
            {siteConfig.artistName}
          </p>
          <form onSubmit={login} className="flex flex-col gap-4">
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="border border-neutral-300 px-4 py-3 text-sm focus:outline-none focus:border-neutral-900 transition-colors"
              autoFocus
            />
            {loginError && <p className="text-red-500 text-xs">{loginError}</p>}
            <button
              type="submit"
              className="bg-neutral-900 text-white text-xs tracking-[0.2em] uppercase py-3 hover:bg-neutral-700 transition-colors"
            >
              Enter
            </button>
          </form>
        </div>
      </div>
    );
  }

  // ── Dashboard ─────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Header */}
      <header className="bg-white border-b border-neutral-200 px-6 py-4 flex justify-between items-center sticky top-0 z-10">
        <h1
          className="text-xl font-light tracking-wide"
          style={{ fontFamily: 'var(--font-cormorant)' }}
        >
          {siteConfig.artistName} — Admin
        </h1>
        <div className="flex items-center gap-6">
          <a href="/" className="text-xs tracking-wider uppercase text-neutral-400 hover:text-neutral-900 transition-colors">
            View Site ↗
          </a>
          <button
            onClick={logout}
            className="text-xs tracking-wider uppercase text-neutral-400 hover:text-neutral-900 transition-colors"
          >
            Logout
          </button>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-6 py-12 flex flex-col gap-16">

        {/* ── Add artwork ── */}
        <section>
          <h2
            className="text-3xl font-light mb-8 text-neutral-900"
            style={{ fontFamily: 'var(--font-cormorant)' }}
          >
            Add New Artwork
          </h2>

          <form
            onSubmit={handleSubmit}
            className="bg-white border border-neutral-200 p-8 grid md:grid-cols-2 gap-8"
          >
            {/* Image picker */}
            <div className="flex flex-col gap-3">
              <div
                className="aspect-[4/5] bg-neutral-100 border-2 border-dashed border-neutral-300 flex items-center justify-center cursor-pointer hover:border-neutral-600 transition-colors overflow-hidden"
                onClick={() => fileRef.current?.click()}
              >
                {preview ? (
                  <img src={preview} alt="Preview" className="w-full h-full object-cover" />
                ) : (
                  <div className="text-center px-4">
                    <p className="text-neutral-400 text-sm mb-1">Click to select photo</p>
                    <p className="text-neutral-300 text-xs">JPG, PNG — max 10MB</p>
                  </div>
                )}
              </div>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="hidden"
              />
              {preview && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="text-xs text-neutral-400 hover:text-neutral-700 text-left transition-colors"
                >
                  Remove image
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
                <div key={key} className="flex flex-col gap-1.5">
                  <label className="text-xs tracking-wider uppercase text-neutral-500">{label}</label>
                  <input
                    type="text"
                    value={form[key]}
                    onChange={e => setForm({ ...form, [key]: e.target.value })}
                    placeholder={placeholder}
                    className="border border-neutral-300 px-4 py-2.5 text-sm focus:outline-none focus:border-neutral-900 transition-colors"
                  />
                </div>
              ))}

              <label className="flex items-center gap-3 cursor-pointer mt-1">
                <input
                  type="checkbox"
                  checked={form.available}
                  onChange={e => setForm({ ...form, available: e.target.checked })}
                  className="w-4 h-4 accent-neutral-900"
                />
                <span className="text-sm text-neutral-600">Available for sale</span>
              </label>

              {message && (
                <p className={`text-xs ${message.startsWith('✓') ? 'text-green-600' : 'text-neutral-500'}`}>
                  {message}
                </p>
              )}

              <button
                type="submit"
                disabled={uploading}
                className="mt-2 bg-neutral-900 text-white text-xs tracking-[0.2em] uppercase py-3.5 hover:bg-neutral-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {uploading ? 'Saving…' : 'Save Artwork'}
              </button>
            </div>
          </form>
        </section>

        {/* ── Artwork list ── */}
        <section>
          <h2
            className="text-3xl font-light mb-8 text-neutral-900"
            style={{ fontFamily: 'var(--font-cormorant)' }}
          >
            Your Artworks{artworks.length > 0 ? ` (${artworks.length})` : ''}
          </h2>

          {artworks.length === 0 ? (
            <p className="text-neutral-400 text-sm">No artworks yet. Add your first one above.</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {artworks.map(art => (
                <div key={art.id} className="bg-white border border-neutral-200 overflow-hidden">
                  <div className="aspect-[4/5] bg-neutral-100 overflow-hidden">
                    <img
                      src={art.image_url}
                      alt={art.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="p-3 flex flex-col gap-2">
                    <p className="text-sm font-medium truncate">{art.title}</p>
                    <p className="text-xs text-neutral-400">{art.price || '—'}</p>
                    <div className="flex items-center justify-between pt-1">
                      <button
                        onClick={() => toggleAvailable(art.id, art.available)}
                        className={`text-xs px-2 py-1 border transition-colors ${
                          art.available
                            ? 'border-green-300 text-green-700 hover:bg-green-50'
                            : 'border-neutral-300 text-neutral-500 hover:bg-neutral-50'
                        }`}
                      >
                        {art.available ? 'Available' : 'Sold'}
                      </button>
                      <button
                        onClick={() => deleteArtwork(art.id)}
                        className="text-xs text-red-400 hover:text-red-600 transition-colors"
                      >
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
    </div>
  );
}
