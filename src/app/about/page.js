import About from '@/components/About';
import Contact from '@/components/Contact';

export const dynamic = 'force-dynamic';

export default function AboutPage() {
  return (
    <>
      <main className="pt-20">
        <About />
        <Contact />
      </main>
    </>
  );
}
