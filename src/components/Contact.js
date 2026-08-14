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

  const whatsappLink = `https://wa.me/${whatsapp}?text=${encodeURIComponent("Hi! I'd love to inquire about your artwork.")}`;
  const instagramLink = `https://instagram.com/${instagram}`;

  return (
    <footer
      id="contact"
      className="py-28 text-white"
      style={{ backgroundColor: '#a68b57' }}
    >
      <div className="max-w-6xl mx-auto px-6 flex flex-col items-center text-center gap-10">

        <div className="flex flex-col gap-4">
          <p className="text-xs tracking-[0.35em] uppercase text-white/70">Commissions & Sales</p>
          <h2
            className="text-5xl md:text-6xl font-light leading-tight"
            style={{ fontFamily: "var(--font-cormorant)" }}
          >
            Get in Touch
          </h2>
          <p className="text-white/80 text-sm leading-relaxed max-w-sm mx-auto">
            {intro}
          </p>
        </div>

        {/* Contact links — all inline, no big button */}
        <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-4 text-xs tracking-[0.2em] uppercase text-white/85">
          <a href={whatsappLink} target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">
            WhatsApp
          </a>
          <span className="w-px h-4 bg-white/30" />
          <a href={`mailto:${email}`} className="hover:text-white transition-colors">
            Email
          </a>
          <span className="w-px h-4 bg-white/30" />
          <a href={instagramLink} target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">
            Instagram
          </a>
        </div>

        {/* Footer line */}
        <div className="w-full border-t border-white/20 pt-8 flex flex-col sm:flex-row justify-between items-center gap-3 text-xs text-white/60 tracking-wider">
          <span className="text-lg" style={{ fontFamily: "var(--font-cormorant)" }}>
            {siteConfig.artistName}
          </span>
          <span>© {new Date().getFullYear()} All rights reserved</span>
        </div>
      </div>
    </footer>
  );
}
