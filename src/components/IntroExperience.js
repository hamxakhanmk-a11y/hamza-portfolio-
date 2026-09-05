'use client';

import Link from 'next/link';
import { useLayoutEffect, useRef } from 'react';
import { siteConfig } from '@/data/config';

export default function IntroExperience({ heroImage, cameraStages }) {
  const rootRef = useRef(null);
  const mediaRef = useRef(null);
  const stage2X = cameraStages?.[2]?.x ?? 72;
  const stage2Y = cameraStages?.[2]?.y ?? 35;
  const stage2Zoom = cameraStages?.[2]?.zoom ?? 1.32;
  const stage3X = cameraStages?.[3]?.x ?? 28;
  const stage3Y = cameraStages?.[3]?.y ?? 48;
  const stage3Zoom = cameraStages?.[3]?.zoom ?? 1.48;

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
        const firstDetail = {
          scale: stage2Zoom,
          transformOrigin: `${stage2X}% ${stage2Y}%`,
        };
        const secondDetail = {
          scale: stage3Zoom,
          transformOrigin: `${stage3X}% ${stage3Y}%`,
        };

        gsap.set(scenes, { autoAlpha: 0, scale: .985, yPercent: 2 });
        gsap.set(scenes[0], { autoAlpha: 1, scale: 1, yPercent: 0 });
        gsap.set(mediaRef.current, { scale: 1, transformOrigin: '50% 50%' });

        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

        const timeline = gsap.timeline({
          scrollTrigger: {
            trigger: rootRef.current,
            start: 'top top',
            end: 'bottom bottom',
            scrub: 0.65,
          },
        });

        // Four-part scrollytelling camera: establishing shot, two details, full reveal.
        timeline
          .to(mediaRef.current, {
            ...firstDetail,
            duration: 1,
            ease: 'power2.inOut',
          }, 0)
          .to(mediaRef.current, {
            ...secondDetail,
            duration: 1,
            ease: 'power2.inOut',
          }, 1)
          .to(mediaRef.current, {
            scale: 1,
            transformOrigin: '50% 50%',
            duration: 1,
            ease: 'power2.inOut',
          }, 2)
          .to(scenes[0], {
            autoAlpha: 0,
            scale: 1.025,
            yPercent: -2,
            duration: .24,
            ease: 'power1.inOut',
          }, .58)
          .fromTo(scenes[1],
            { autoAlpha: 0, scale: 1.035, yPercent: 2 },
            { autoAlpha: 1, scale: 1, yPercent: 0, duration: .28, ease: 'power1.out' },
            .72,
          )
          .to(scenes[1], {
            autoAlpha: 0,
            scale: 1.025,
            yPercent: -2,
            duration: .24,
            ease: 'power1.in',
          }, 1.58)
          .fromTo(scenes[2],
            { autoAlpha: 0, scale: 1.035, yPercent: 2 },
            { autoAlpha: 1, scale: 1, yPercent: 0, duration: .28, ease: 'power1.out' },
            1.72,
          )
          .to(scenes[2], {
            autoAlpha: 0,
            scale: 1.025,
            yPercent: -2,
            duration: .24,
            ease: 'power1.in',
          }, 2.58)
          .fromTo(scenes[3],
            { autoAlpha: 0, scale: 1.035, yPercent: 2 },
            { autoAlpha: 1, scale: 1, yPercent: 0, duration: .3, ease: 'power1.out' },
            2.7,
          );
      }, rootRef);
    }

    createScrollStory();
    return () => {
      cancelled = true;
      context?.revert();
    };
  }, [stage2X, stage2Y, stage2Zoom, stage3X, stage3Y, stage3Zoom]);

  return (
    <section ref={rootRef} className="intro-shell intro-embedded" aria-label="Featured artwork introduction">
      <div className="intro-sticky">
        <div ref={mediaRef} className="intro-media" aria-hidden="true">
          {heroImage ? (
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
