'use client';

import Link from 'next/link';
import { useLayoutEffect, useRef } from 'react';
import { siteConfig } from '@/data/config';

export default function IntroExperience({ heroImage, animatedImage, settings }) {
  const rootRef = useRef(null);
  const mediaRef = useRef(null);
  const animatedIsVideo = /\.(mp4|webm)(?:\?|$)/i.test(animatedImage || '');
  const mediaStyle = {
    objectPosition: `${settings?.x ?? 50}% ${settings?.y ?? 50}%`,
    transform: `scale(${settings?.zoom ?? 1})`,
  };

  useLayoutEffect(() => {
    let context;
    let cancelled = false;

    async function createScrollStory() {
      const [{ gsap }, scrollTriggerModule] = await Promise.all([
        import('gsap'),
        import('gsap/ScrollTrigger'),
      ]);
      if (cancelled || !rootRef.current) return;

      const ScrollTrigger = scrollTriggerModule.ScrollTrigger || scrollTriggerModule.default;
      gsap.registerPlugin(ScrollTrigger);

      context = gsap.context(() => {
        const scenes = gsap.utils.toArray('.intro-scene');
        gsap.set(scenes, { autoAlpha: 0, scale: .985, yPercent: 2 });
        gsap.set(scenes[0], { autoAlpha: 1, scale: 1, yPercent: 0 });

        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

        gsap.to(mediaRef.current, {
          scale: 1.045,
          duration: 7,
          repeat: -1,
          yoyo: true,
          ease: 'sine.inOut',
        });

        const timeline = gsap.timeline({
          defaults: { ease: 'none' },
          scrollTrigger: {
            trigger: rootRef.current,
            start: 'top top',
            end: 'bottom bottom',
            scrub: 0.65,
          },
        });

        scenes.forEach((scene, index) => {
          if (index === 0) {
            timeline.to(scene, { autoAlpha: 0, scale: 1.025, yPercent: -2, duration: 0.45 }, 0.55);
            return;
          }
          const position = index * 1.15;
          timeline
            .fromTo(scene,
              { autoAlpha: 0, scale: 1.025, yPercent: 2 },
              { autoAlpha: 1, scale: 1, yPercent: 0, duration: 0.45 },
              position,
            )
            .to(scene,
              { autoAlpha: index === scenes.length - 1 ? 1 : 0, scale: 1.02, yPercent: index === scenes.length - 1 ? 0 : -2, duration: 0.45 },
              position + 0.7,
            );
        });
      }, rootRef);
    }

    createScrollStory();
    return () => {
      cancelled = true;
      context?.revert();
    };
  }, []);

  return (
    <section ref={rootRef} className="intro-shell intro-embedded" aria-label="Featured artwork introduction">
      <div className="intro-sticky">
        <div ref={mediaRef} className="intro-media" aria-hidden="true">
          {animatedImage && animatedIsVideo ? (
            <video src={animatedImage} muted loop autoPlay playsInline preload="auto" style={mediaStyle} />
          ) : animatedImage ? (
            <img src={animatedImage} alt="" style={mediaStyle} />
          ) : heroImage ? (
            <img src={heroImage} alt="" />
          ) : null}
          <div className="intro-media-shade" />
        </div>

        <div className="intro-canvas">
          <div className="intro-scene">
            <div className="intro-type-scene">
              <p className="intro-eyebrow">Original Artworks</p>
              <div className="intro-letter-line" aria-label={siteConfig.artistName}>
                {siteConfig.artistName.split('').map((letter, index) => (
                  <span key={`${letter}-${index}`} style={{ animationDelay: `${index * 70}ms` }}>{letter === ' ' ? '\u00a0' : letter}</span>
                ))}
              </div>
            </div>
          </div>

          <div className="intro-scene">
            <div className="intro-art-scene">
              <div className="intro-art-copy">
                <p>Painted with intention</p>
                <h2>Where imagination flows</h2>
              </div>
            </div>
          </div>

          <div className="intro-scene">
            <div className="intro-collection-scene">
              <p className="intro-eyebrow">Explore the Studio</p>
              <div className="intro-collection-words">
                <span>Portfolio</span><span>Commissions</span><span>Shows</span>
              </div>
            </div>
          </div>

          <div className="intro-scene">
            <Link href="/portfolio" className="intro-enter-scene">
              <span>Enter the</span>
              <strong>Collection</strong>
              <i>→</i>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
