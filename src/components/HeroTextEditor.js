'use client';

const STAGES = [
  { number: 1, note: 'Opening full-painting view' },
  { number: 2, note: 'First detail view' },
  { number: 3, note: 'Second detail view' },
  { number: 4, note: 'Final full-painting view' },
];

export default function HeroTextEditor({ values, defaults, onChange, onSave, saving, message }) {
  return (
    <section className="border border-neutral-200 bg-white p-4 sm:p-8">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div>
          <p className="text-[10px] uppercase tracking-[0.22em] text-[#075f8f]">Scroll Story</p>
          <h3 className="mt-1 text-2xl font-light" style={{ fontFamily: 'var(--font-cormorant)' }}>
            Hero Stage Text
          </h3>
          <p className="mt-2 max-w-2xl text-xs leading-relaxed text-neutral-500">
            Edit the small introduction and main line shown at each of the four camera stops.
          </p>
        </div>
        <button
          type="button"
          onClick={onSave}
          disabled={saving}
          className="self-start bg-neutral-900 px-6 py-3 text-[10px] uppercase tracking-[0.17em] text-white transition-colors hover:bg-neutral-700 disabled:opacity-40"
        >
          {saving ? 'Saving Text…' : 'Save All Stage Text'}
        </button>
      </div>

      <div className="mt-7 grid gap-4 md:grid-cols-2">
        {STAGES.map(({ number, note }) => {
          const eyebrowKey = `hero_stage_${number}_eyebrow`;
          const titleKey = `hero_stage_${number}_title`;
          return (
            <div key={number} className="border border-neutral-200 bg-[#fffdfa] p-4 sm:p-5">
              <div className="mb-4 flex items-center justify-between gap-4">
                <h4 className="font-medium text-neutral-800">Stage {number}</h4>
                <span className="text-[9px] uppercase tracking-[0.12em] text-neutral-400">{note}</span>
              </div>
              <label className="flex flex-col gap-2">
                <span className="text-[9px] uppercase tracking-[0.16em] text-neutral-500">Small line</span>
                <input
                  type="text"
                  value={values[eyebrowKey] ?? defaults[eyebrowKey]}
                  onChange={event => onChange({ [eyebrowKey]: event.target.value })}
                  className="border border-neutral-300 bg-white px-3 py-2.5 text-sm focus:border-[#075f8f] focus:outline-none"
                />
              </label>
              <label className="mt-4 flex flex-col gap-2">
                <span className="text-[9px] uppercase tracking-[0.16em] text-neutral-500">Main line</span>
                <textarea
                  rows={2}
                  value={values[titleKey] ?? defaults[titleKey]}
                  onChange={event => onChange({ [titleKey]: event.target.value })}
                  className="resize-y border border-neutral-300 bg-white px-3 py-2.5 text-sm leading-relaxed focus:border-[#075f8f] focus:outline-none"
                />
              </label>
            </div>
          );
        })}
      </div>

      {message && (
        <p className={`mt-5 text-xs ${message.startsWith('✓') ? 'text-green-600' : 'text-neutral-500'}`}>
          {message}
        </p>
      )}
    </section>
  );
}
