import { createClient } from '@supabase/supabase-js';
import { siteConfig } from '@/data/config';

async function getContactInfo() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );
    const { data } = await supabase.from('site_text').select('key,value');
    const out = {};
    (data || []).forEach(r => { out[r.key] = r.value; });
    return out;
  } catch { return {}; }
}

export default async function Contact() {
  const info = await getContactInfo();
  const whatsapp = info.contact_whatsapp || siteConfig.whatsapp;
  const email = info.contact_email || siteConfig.email;
  const instagram = info.contact_instagram || siteConfig.instagram;
  const intro = info.contact_intro || "Interested in a piece? Have a commission in mind? Reach out — I'd love to hear from you.";

  const whatsappNumber = String(whatsapp || '').replace(/\D/g, '');
  const instagramValue = String(instagram || '').trim();
  const instagramHandle = instagramValue
    .replace(/^https?:\/\/(www\.)?instagram\.com\//i, '')
    .replace(/^@/, '')
    .replace(/\/?(?:\?.*)?$/, '');
  const whatsappLink = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent("Hi! I'd love to inquire about your artwork.")}`;
  const instagramLink = /^https?:\/\//i.test(instagramValue) ? instagramValue : `https://www.instagram.com/${instagramHandle}/`;

  return (
    <footer
      id="contact"
      className="py-20 text-white sm:py-28"
      style={{ background: 'linear-gradient(145deg, var(--color-deep-ocean), var(--color-ocean))' }}
    >
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-10 px-4 text-center sm:px-6">

        <div className="flex flex-col gap-4">
          <p className="text-xs tracking-[0.35em] uppercase text-white/70">Commissions & Sales</p>
          <h2
            className="text-4xl font-light leading-tight sm:text-5xl md:text-6xl"
            style={{ fontFamily: "var(--font-cormorant)" }}
          >
            Get in Touch
          </h2>
          <p className="text-white/80 text-sm leading-relaxed max-w-sm mx-auto">
            {intro}
          </p>
        </div>

        {/* Contact links — all inline, no big button */}
        <div className="grid w-full max-w-xs grid-cols-1 items-center justify-center gap-1 text-xs uppercase tracking-[0.2em] text-white/85 sm:flex sm:max-w-none sm:flex-wrap sm:gap-x-8 sm:gap-y-4">
          <a href={whatsappLink} target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">
            WhatsApp
          </a>
          <span className="hidden h-4 w-px bg-white/30 sm:block" />
          <a href={`mailto:${email}?subject=${encodeURIComponent('Artwork inquiry')}`} className="py-3 transition-colors hover:text-white sm:py-0">
            Email
          </a>
          <span className="hidden h-4 w-px bg-white/30 sm:block" />
          <a href={instagramLink} target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">
            Instagram
          </a>
        </div>

        {/* Footer line */}
        <div className="w-full border-t border-white/20 pt-8 flex flex-col sm:flex-row justify-between items-center gap-3 text-xs text-white/60 tracking-wider">
          <span className="text-lg" style={{ fontFamily: "var(--font-cormorant)" }}>
            {siteConfig.artistName}
          </span>
          <span>All content made by {siteConfig.artistName}</span>
        </div>
      </div>
    </footer>
  );
}
