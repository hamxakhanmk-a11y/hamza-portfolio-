import { siteConfig } from "@/data/config";

export default function Contact() {
  const whatsappLink = `https://wa.me/${siteConfig.whatsapp}?text=${encodeURIComponent("Hi! I'd love to inquire about your artwork.")}`;
  const instagramLink = `https://instagram.com/${siteConfig.instagram}`;

  return (
    <footer id="contact" className="bg-neutral-900 text-white py-28">
      <div className="max-w-6xl mx-auto px-6 flex flex-col items-center text-center gap-10">

        <div className="flex flex-col gap-4">
          <p className="text-xs tracking-[0.35em] uppercase text-neutral-400">Commissions & Sales</p>
          <h2
            className="text-5xl md:text-6xl font-light leading-tight"
            style={{ fontFamily: "var(--font-cormorant)" }}
          >
            Get in Touch
          </h2>
          <p className="text-neutral-400 text-sm leading-relaxed max-w-sm mx-auto">
            Interested in a piece? Have a commission in mind? Reach out — I'd love to hear from you.
          </p>
        </div>

        {/* WhatsApp button */}
        <a
          href={whatsappLink}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 bg-[#25D366] text-white text-sm tracking-wider uppercase px-10 py-4 hover:bg-[#1ebe5d] transition-colors"
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
          </svg>
          Message on WhatsApp
        </a>

        {/* Other links */}
        <div className="flex items-center gap-8 text-xs tracking-[0.2em] uppercase text-neutral-400">
          <a
            href={`mailto:${siteConfig.email}`}
            className="hover:text-white transition-colors"
          >
            Email
          </a>
          <span className="w-px h-4 bg-neutral-700" />
          <a
            href={instagramLink}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-white transition-colors"
          >
            Instagram
          </a>
        </div>

        {/* Footer line */}
        <div className="w-full border-t border-neutral-800 pt-8 flex flex-col sm:flex-row justify-between items-center gap-3 text-xs text-neutral-600 tracking-wider">
          <span
            className="text-lg"
            style={{ fontFamily: "var(--font-cormorant)" }}
          >
            {siteConfig.artistName}
          </span>
          <span>© {new Date().getFullYear()} All rights reserved</span>
        </div>
      </div>
    </footer>
  );
}
