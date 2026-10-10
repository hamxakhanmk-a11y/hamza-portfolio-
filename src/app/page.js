export const dynamic = 'force-dynamic';

import Hero from "@/components/Hero";
import Gallery from "@/components/Gallery";
import HomeGalleryTour from "@/components/HomeGalleryTour";
import Contact from "@/components/Contact";
import CommissionInquiry from "@/components/CommissionInquiry";
import HomeMistTransition, { HomeSkyIntro } from "@/components/HomeMistTransition";
import HomeSmoothScroll from "@/components/HomeSmoothScroll";
import mistStyles from "@/components/HomeMistTransition.module.css";

export default function Home() {
  return (
    <>
      <main className={mistStyles.journey}>
        <HomeSmoothScroll />
        <HomeSkyIntro />
        <Hero />
        <HomeMistTransition />
        <HomeGalleryTour />
        <Gallery />
        <CommissionInquiry compact />
        <Contact />
      </main>
    </>
  );
}
