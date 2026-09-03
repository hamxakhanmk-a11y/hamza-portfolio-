import { createClient } from '@supabase/supabase-js';
import CommissionForm from '@/components/CommissionForm';
import { siteConfig } from '@/data/config';

async function getCommissionSection() {
  try {
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
    const { data: textRows } = await supabase.from('site_text').select('key,value');
    const text = {};
    (textRows || []).forEach(row => { text[row.key] = row.value; });
    return { text };
  } catch {
    return { text: {} };
  }
}

export default async function CommissionInquiry({ compact = false }) {
  const { text } = await getCommissionSection();
  const whatsapp = text.contact_whatsapp || siteConfig.whatsapp;
  const email = text.contact_email || siteConfig.email;
  const instagramValue = text.contact_instagram || siteConfig.instagram;
  const instagram = /^https?:\/\//i.test(instagramValue)
    ? instagramValue
    : `https://www.instagram.com/${String(instagramValue).replace(/^@/, '')}/`;
  return (
    <section data-scroll-scene={compact ? 'commission' : undefined} className={`commission-inquiry ${compact ? 'commission-inquiry-home home-commission-scene' : ''}`}>
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div data-commission-card className="overflow-hidden border border-[#075f8f]/20 bg-[#fffaf2] shadow-[0_24px_70px_rgba(6,58,91,.12)]">
          <div className="grid lg:grid-cols-[1.22fr_.78fr]">
            <div data-commission-copy className="border-b border-[#075f8f]/20 p-6 sm:p-10 lg:border-b-0 lg:border-r lg:p-14">
              <p className="mb-3 text-xs uppercase tracking-[0.32em] text-[#ed7189]">Made Especially for You</p>
              <h2 className="text-4xl font-light leading-none text-[#063a5b] sm:text-5xl lg:text-6xl" style={{ fontFamily: 'var(--font-cormorant)' }}>
                Commission a Piece
              </h2>
              <p className="mt-4 text-xl italic text-[#075f8f] sm:text-2xl" style={{ fontFamily: 'var(--font-cormorant)' }}>
                Let&apos;s create something meaningful
              </p>
              <p className="mt-7 max-w-2xl text-sm leading-7 text-[#183746]/75 sm:text-base">
                I create original, hand-painted artworks tailored to your story, space, and vision. Every commission is a collaborative journey.
              </p>

              <div className="mt-10 border border-[#ed7189]/35 bg-[#ed7189]/8 px-5 py-5 text-center text-sm tracking-wide text-[#075f8f]">
                Currently accepting commissions
              </div>
            </div>

            <div data-commission-form className="p-6 sm:p-10 lg:p-12">
              <CommissionForm whatsapp={whatsapp} />
              <div className="mt-8 flex flex-wrap items-center justify-center gap-5 border-t border-[#075f8f]/20 pt-7 text-xs uppercase tracking-[0.16em] text-[#075f8f]">
                <a href={`mailto:${email}?subject=${encodeURIComponent('Commission inquiry')}`} className="transition hover:text-[#ed7189]">Email →</a>
                <span className="h-4 w-px bg-[#075f8f]/25" />
                <a href={instagram} target="_blank" rel="noopener noreferrer" className="transition hover:text-[#ed7189]">Instagram →</a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
