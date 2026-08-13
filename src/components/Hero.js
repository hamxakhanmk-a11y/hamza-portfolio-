import { siteConfig } from "@/data/config";

export default function Hero() {
  return (
    <section className="min-h-screen pt-16 flex items-center bg-white">
      <div className="max-w-6xl mx-auto px-6 w-full grid md:grid-cols-2 gap-12 items-center py-20">

        {/* Text */}
        <div className="flex flex-col gap-6 order-2 md:order-1">
          <p className="text-xs tracking-[0.35em] uppercase text-neutral-400">
            Original Artworks
          </p>
          <h1
            className="text-7xl md:text-8xl font-light leading-[1.02] text-neutral-900"
            style={{ fontFamily: "var(--font-cormorant)" }}
          >
            {siteConfig.artistName}
          </h1>
          <p className="text-neutral-500 text-base leading-relaxed max-w-xs">
            {siteConfig.tagline}
          </p>
          <div className="flex flex-wrap gap-3 pt-2">
            <a
              href="#gallery"
              className="bg-neutral-900 text-white text-xs tracking-[0.2em] uppercase px-8 py-3.5 hover:bg-neutral-700 transition-colors"
            >
              View Works
            </a>
            <a
              href="#contact"
              className="border border-neutral-300 text-xs tracking-[0.2em] uppercase px-8 py-3.5 hover:border-neutral-900 transition-colors"
            >
              Get in Touch
            </a>
          </div>
        </div>

        {/* Featured image */}
        {/* Add your best artwork to /public/images/hero.jpg */}
        <div className="relative aspect-[3/4] bg-neutral-100 overflow-hidden order-1 md:order-2">
          <img
            src="/images/hero.jpg"
            alt="Featured artwork"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 flex items-end p-6 pointer-events-none">
            <p className="text-neutral-300 text-xs tracking-widest uppercase">
              Add hero.jpg to /public/images/
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
