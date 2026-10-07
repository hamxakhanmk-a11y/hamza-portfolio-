export const dynamic = 'force-dynamic';

import Hero from "@/components/Hero";
import Gallery from "@/components/Gallery";
import Contact from "@/components/Contact";
import CommissionInquiry from "@/components/CommissionInquiry";
import WaterSurface from "@/components/WaterSurface";
import HomeMistTransition from "@/components/HomeMistTransition";
import mistStyles from "@/components/HomeMistTransition.module.css";

export default function Home() {
  return (
    <>
      <main className={mistStyles.journey}>
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
