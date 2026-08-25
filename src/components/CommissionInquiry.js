import { createClient } from '@supabase/supabase-js';
import CommissionForm from '@/components/CommissionForm';
import { siteConfig } from '@/data/config';

async function getCommissionSection() {
  try {
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
    const [{ data: textRows }, { data: artworks }] = await Promise.all([
      supabase.from('site_text').select('key,value'),
      supabase.from('artworks').select('id,title,image_url').eq('section', 'commissions').order('display_order').limit(3),
    ]);
    const text = {};
    (textRows || []).forEach(row => { text[row.key] = row.value; });
    return { text, artworks: artworks || [] };
  } catch {
    return { text: {}, artworks: [] };
  }
}

export default async function CommissionInquiry({ compact = false }) {
  const { text, artworks } = await getCommissionSection();
  const whatsapp = text.contact_whatsapp || siteConfig.whatsapp;
  const email = text.contact_email || siteConfig.email;
  const instagramValue = text.contact_instagram || siteConfig.instagram;
  const instagram = /^https?:\/\//i.test(instagramValue)
    ? instagramValue
    : `https://www.instagram.com/${String(instagramValue).replace(/^@/, '')}/`;
  const steps = [
    ['Share Your Idea', 'Tell me about your vision, preferred colors, size, and any inspiration or references.'],
    ['Approve the Direction', 'I’ll develop the direction with you and refine the details until everything feels right.'],
    ['Receive Your Artwork', 'Your finished piece is carefully completed, protected, and prepared for delivery.'],
  ];

  return (
    <section className={`commission-inquiry ${compact ? 'commission-inquiry-home' : ''}`}>
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="overflow-hidden border border-[#075f8f]/20 bg-[#fffaf2] shadow-[0_24px_70px_rgba(6,58,91,.12)]">
          <div className="grid lg:grid-cols-[1.22fr_.78fr]">
            <div className="border-b border-[#075f8f]/20 p-6 sm:p-10 lg:border-b-0 lg:border-r lg:p-14">
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

              <div className="my-9 flex items-center gap-4">
                <span className="h-px flex-1 bg-[#27a8c7]/35" />
                <span className="text-xs uppercase tracking-[0.32em] text-[#063a5b]">The Process</span>
                <span className="h-px flex-1 bg-[#27a8c7]/35" />
              </div>

              <div className="grid gap-5 sm:grid-cols-3">
                {steps.map(([title, description], index) => (
                  <article key={title} className="relative border border-[#075f8f]/15 bg-white/55 p-3 pt-5">
                    <span className="absolute -top-4 left-4 grid h-9 w-9 place-items-center rounded-full bg-[#075f8f] text-sm text-white">{index + 1}</span>
                    <div className="aspect-[4/3] overflow-hidden bg-[#dceef2]">
                      {artworks[index]?.image_url ? (
                        <img src={artworks[index].image_url} alt="" className="living-image h-full w-full object-cover" />
                      ) : (
                        <div className="h-full w-full bg-[radial-gradient(circle_at_35%_35%,rgba(237,113,137,.45),transparent_35%),linear-gradient(145deg,#dceef2,#fffaf2)]" />
                      )}
                    </div>
                    <h3 className="mt-4 text-lg text-[#063a5b]" style={{ fontFamily: 'var(--font-cormorant)' }}>{index + 1}. {title}</h3>
                    <p className="mt-1 text-xs leading-5 text-[#183746]/65">{description}</p>
                  </article>
                ))}
              </div>

              <div className="mt-7 border border-[#ed7189]/35 bg-[#ed7189]/8 px-5 py-4 text-center text-sm tracking-wide text-[#075f8f]">
                Currently accepting commissions
              </div>
            </div>

            <div className="p-6 sm:p-10 lg:p-12">
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
