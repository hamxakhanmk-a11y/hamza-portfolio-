import Navbar from '@/components/Navbar';
import About from '@/components/About';
import Contact from '@/components/Contact';

export const dynamic = 'force-dynamic';

export default function AboutPage() {
  return (
    <>
      <Navbar />
      <main className="pt-20">
        <About />
        <Contact />
      </main>
    </>
  );
}
