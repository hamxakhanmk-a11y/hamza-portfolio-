export const dynamic = 'force-dynamic';

import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import Gallery from "@/components/Gallery";
import Contact from "@/components/Contact";
import SiteIntro from "@/components/SiteIntro";

export default function Home() {
  return (
    <>
      <SiteIntro />
      <Navbar />
      <main>
        <Hero />
        <Gallery />
        <Contact />
      </main>
    </>
  );
}
