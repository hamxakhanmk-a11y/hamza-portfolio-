import { siteConfig } from "@/data/config";

export default function About() {
  return (
    <section id="about" className="py-28 bg-neutral-50">
      <div className="max-w-6xl mx-auto px-6">
        <div className="grid md:grid-cols-2 gap-16 items-center">

          {/* Photo */}
          {/* Add your photo to /public/images/about.jpg */}
          <div className="relative aspect-[3/4] bg-neutral-200 overflow-hidden">
            <img
              src="/images/about.jpg"
              alt={siteConfig.artistName}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 flex items-end p-6 pointer-events-none">
              <p className="text-neutral-400 text-xs tracking-widest uppercase">
                Add about.jpg to /public/images/
              </p>
            </div>
          </div>

          {/* Text */}
          <div className="flex flex-col gap-6">
            <p className="text-xs tracking-[0.35em] uppercase text-neutral-400">The Artist</p>
            <h2
              className="text-5xl font-light text-neutral-900 leading-tight"
              style={{ fontFamily: "var(--font-cormorant)" }}
            >
              About
            </h2>
            <div className="w-8 h-px bg-neutral-300" />
            <p className="text-neutral-600 leading-relaxed text-base">
              {siteConfig.bio}
            </p>
            <a
              href="#contact"
              className="self-start text-xs tracking-[0.2em] uppercase border-b border-neutral-900 pb-0.5 hover:text-neutral-500 hover:border-neutral-500 transition-colors mt-2"
            >
              Get in Touch
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
