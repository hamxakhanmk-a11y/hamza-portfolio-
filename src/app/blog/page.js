import Navbar from '@/components/Navbar';
import { siteConfig } from '@/data/config';

export const metadata = {
  title: `Blog | ${siteConfig.artistName}`,
};

export default function BlogPage() {
  return (
    <>
      <Navbar />
      <main className="min-h-screen pt-32 pb-24 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <p className="text-xs tracking-[0.35em] uppercase mb-4" style={{ color: '#3d6478' }}>
            Writing
          </p>
          <h1
            className="text-5xl font-light mb-6 text-neutral-800"
            style={{ fontFamily: 'var(--font-cormorant)' }}
          >
            Blog
          </h1>
          <p className="text-neutral-400 text-sm">Posts coming soon.</p>
        </div>
      </main>
    </>
  );
}
