'use client';

import { useState } from 'react';

export default function CommissionForm({ whatsapp }) {
  const [form, setForm] = useState({ name: '', email: '', type: '', idea: '' });

  function update(event) {
    setForm(current => ({ ...current, [event.target.name]: event.target.value }));
  }

  function submit(event) {
    event.preventDefault();
    const number = String(whatsapp || '').replace(/\D/g, '');
    const message = [
      'Hello! I would like to commission an artwork.',
      `Name: ${form.name}`,
      `Email: ${form.email}`,
      `Project type: ${form.type}`,
      `Idea: ${form.idea}`,
    ].join('\n');
    window.open(`https://wa.me/${number}?text=${encodeURIComponent(message)}`, '_blank', 'noopener,noreferrer');
  }

  const fieldClass = 'w-full rounded-sm border border-[#27a8c7]/35 bg-white/65 px-4 py-3.5 text-sm text-[#183746] outline-none transition focus:border-[#075f8f] focus:ring-2 focus:ring-[#27a8c7]/15';

  return (
    <form onSubmit={submit} className="flex flex-col gap-5">
      <label className="flex flex-col gap-2 text-sm text-[#183746]">
        Name
        <input required name="name" value={form.name} onChange={update} placeholder="Your full name" className={fieldClass} />
      </label>
      <label className="flex flex-col gap-2 text-sm text-[#183746]">
        Email
        <input required type="email" name="email" value={form.email} onChange={update} placeholder="your.email@example.com" className={fieldClass} />
      </label>
      <label className="flex flex-col gap-2 text-sm text-[#183746]">
        Project Type
        <select required name="type" value={form.type} onChange={update} className={fieldClass}>
          <option value="" disabled>Select an option</option>
          <option>Original painting</option>
          <option>Portrait</option>
          <option>Custom size artwork</option>
          <option>Gift commission</option>
          <option>Other</option>
        </select>
      </label>
      <label className="flex flex-col gap-2 text-sm text-[#183746]">
        Tell me about your idea
        <textarea required name="idea" value={form.idea} onChange={update} rows={5} placeholder="Share your vision, preferred size, timeline, colors, and any references." className={`${fieldClass} resize-y`} />
      </label>
      <button type="submit" className="mt-1 bg-[#ed7189] px-6 py-4 text-sm uppercase tracking-[0.18em] text-white transition hover:bg-[#075f8f]">
        Send Inquiry on WhatsApp
      </button>
    </form>
  );
}
