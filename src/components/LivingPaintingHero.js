export default function LivingPaintingHero({ imageUrl }) {
  if (!imageUrl) {
    return (
      <section className="flex min-h-[72svh] items-center justify-center bg-neutral-200 sm:min-h-[85svh]">
        <p className="text-xs text-neutral-400">Upload a hero painting in Admin → Site Photos</p>
      </section>
    );
  }

  return (
    <section className="living-painting relative min-h-[78svh] overflow-hidden bg-[#0a5278] sm:min-h-[90svh] lg:min-h-screen" aria-label="Living underwater painting">
      <img src={imageUrl} alt="" aria-hidden="true" className="living-painting-backdrop absolute inset-0 h-full w-full object-cover" />
      <div className="absolute inset-0 bg-[#063d61]/35" />

      <div className="absolute inset-0 flex items-center justify-center px-3 pb-4 pt-20 sm:px-8 sm:pb-8 sm:pt-24">
        <div className="living-painting-frame relative max-h-full max-w-full overflow-hidden shadow-[0_24px_80px_rgba(0,25,45,.38)]">
          <img src={imageUrl} alt="Painting of a girl riding a flowing fish underwater" className="relative z-[1] block h-full w-full object-contain" />

          <img src={imageUrl} alt="" aria-hidden="true" className="living-layer living-upper-fins" />
          <img src={imageUrl} alt="" aria-hidden="true" className="living-layer living-middle-fins" />
          <img src={imageUrl} alt="" aria-hidden="true" className="living-layer living-tail-fins" />

          <div className="living-caustics absolute inset-0 z-[5]" />
          <div className="living-current current-one" />
          <div className="living-current current-two" />

          {[
            ['18%', '69%', '0s'], ['22%', '64%', '-1.8s'], ['16%', '61%', '-3.2s'],
            ['27%', '72%', '-4.3s'], ['14%', '74%', '-2.5s'], ['31%', '66%', '-5.1s'],
          ].map(([left, top, delay], index) => (
            <span key={index} className="living-bubble" style={{ left, top, animationDelay: delay }} />
          ))}
        </div>
      </div>
    </section>
  );
}
