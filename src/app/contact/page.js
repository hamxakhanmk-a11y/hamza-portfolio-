import Navbar from '@/components/Navbar';
import Contact from '@/components/Contact';

export default function ContactPage() {
  return (
    <>
      <Navbar />
      <main className="pt-20">
        <Contact />
      </main>
    </>
  );
}
