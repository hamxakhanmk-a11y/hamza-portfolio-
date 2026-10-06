export const dynamic = 'force-dynamic';

import Hero from "@/components/Hero";
import Gallery from "@/components/Gallery";
import Contact from "@/components/Contact";
import CommissionInquiry from "@/components/CommissionInquiry";
import WaterSurface from "@/components/WaterSurface";
import HomeMistTransition from "@/components/HomeMistTransition";

export default function Home() {
  return (
    <>
      <main>
        <WaterSurface />
        <Hero />
        <HomeMistTransition />
        <Gallery />
        <CommissionInquiry compact />
        <Contact />
      </main>
    </>
  );
}
