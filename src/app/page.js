export const dynamic = 'force-dynamic';

import Hero from "@/components/Hero";
import Gallery from "@/components/Gallery";
import Contact from "@/components/Contact";
import CommissionInquiry from "@/components/CommissionInquiry";
import WaterSurface from "@/components/WaterSurface";

export default function Home() {
  return (
    <>
      <main>
        <WaterSurface />
        <Hero />
        <Gallery />
        <CommissionInquiry compact />
        <Contact />
      </main>
    </>
  );
}
