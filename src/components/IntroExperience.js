'use client';

import Link from 'next/link';
import { useLayoutEffect, useRef } from 'react';
import { siteConfig } from '@/data/config';
import HeroMedia from '@/components/HeroMedia';
import ScarfMotion from '@/components/ScarfMotion';

export default function IntroExperience({ heroImage, cameraStages, heroText }) {
  const rootRef = useRef(null);
  const mediaRef = useRef(null);
  const imageRef = useRef(null);
  const stage1X = cameraStages?.[1]?.x ?? 50;
  const stage1Y = cameraStages?.[1]?.y ?? 50;
  const stage1Zoom = cameraStages?.[1]?.zoom ?? 1;
  const stage2X = cameraStages?.[2]?.x ?? 72;
  const stage2Y = cameraStages?.[2]?.y ?? 35;
  const stage2Zoom = cameraStages?.[2]?.zoom ?? 1.32;
  const stage3X = cameraStages?.[3]?.x ?? 28;
  const stage3Y = cameraStages?.[3]?.y ?? 48;
  const stage3Zoom = cameraStages?.[3]?.zoom ?? 1.48;
  const stage4X = cameraStages?.[4]?.x ?? 50;
  const stage4Y = cameraStages?.[4]?.y ?? 50;
  const stage4Zoom = cameraStages?.[4]?.zoom ?? 1;
  const textPosition = stage => ({
    '--intro-text-x': `${heroText?.[stage]?.x ?? 50}%`,
    '--intro-text-y': `${heroText?.[stage]?.y ?? 50}%`,
    '--intro-text-scale': heroText?.[stage]?.size ?? 1,
  });

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
        const detailCamera = (x, y, zoom) => ({
          scale: zoom,
          xPercent: (x - 50) * (1 - zoom),
          yPercent: (y - 50) * (1 - zoom),
          transformOrigin: '50% 50%',
        });
        const stops = [
          [stage1X, stage1Y, stage1Zoom],
          [stage2X, stage2Y, stage2Zoom],
          [stage3X, stage3Y, stage3Zoom],
          [stage4X, stage4Y, stage4Zoom],
        ];
        gsap.set(scenes, { autoAlpha: 0, yPercent: 3 });
        gsap.set(scenes[0], { autoAlpha: 1, yPercent: 0 });
        gsap.set(mediaRef.current, detailCamera(...stops[0]));
        gsap.set(imageRef.current, { objectPosition: `${stage1X}% ${stage1Y}%` });
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

        // Camera and text follow continuous scroll distance with no stage snapping.
        const timeline = gsap.timeline({
          defaults: { ease: 'none' },
          scrollTrigger: {
            trigger: rootRef.current,
            start: 'top top',
            end: 'bottom bottom',
            scrub: true,
            invalidateOnRefresh: true,
          },
        });
        stops.slice(1).forEach(([x, y, zoom], index) => {
          const at = index + 0.2;
          timeline
            .to(mediaRef.current, { ...detailCamera(x, y, zoom), duration: 0.8 }, at)
            .to(imageRef.current, { objectPosition: `${x}% ${y}%`, duration: 0.8 }, at)
            .to(scenes[index], { autoAlpha: 0, yPercent: -3, duration: 0.25 }, at)
            .to(scenes[index + 1], { autoAlpha: 1, yPercent: 0, duration: 0.35 }, at + 0.45);
        });
        timeline.to({}, { duration: 0.25 });
      }, rootRef);
    }

    createScrollStory();
    return () => { cancelled = true; context?.revert(); };
  }, [stage1X, stage1Y, stage1Zoom, stage2X, stage2Y, stage2Zoom, stage3X, stage3Y, stage3Zoom, stage4X, stage4Y, stage4Zoom]);

  return (
    <section ref={rootRef} className="intro-shell intro-embedded" aria-label="Featured artwork introduction">
      <div className="intro-sticky">
        <div ref={mediaRef} className="intro-media" aria-hidden="true">
          {heroImage ? (
            <HeroMedia ref={imageRef} src={heroImage} alt="" preload="auto" />
          ) : null}
          {heroImage ? <ScarfMotion src={heroImage} imageRef={imageRef} /> : null}
          <div className="intro-media-shade" />
        </div>

        <div className="intro-canvas">
          <div className="intro-scene">
            <div className="intro-type-scene">
              <div className="intro-positioned-copy" style={textPosition(1)}>
                <p className="intro-eyebrow">{heroText?.[1]?.eyebrow || 'Original Artworks'}</p>
                <div className="intro-letter-line" aria-label={heroText?.[1]?.title || siteConfig.artistName}>
                  {(heroText?.[1]?.title || siteConfig.artistName).split('').map((letter, index) => (
                    <span key={`${letter}-${index}`} style={{ animationDelay: `${index * 70}ms` }}>{letter === ' ' ? '\u00a0' : letter}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="intro-scene">
            <div className="intro-art-scene">
              <div className="intro-art-copy intro-positioned-copy" style={textPosition(2)}>
                <p>{heroText?.[2]?.eyebrow || 'Painted with intention'}</p>
                <h2>{heroText?.[2]?.title || 'Where imagination flows'}</h2>
              </div>
            </div>
          </div>

          <div className="intro-scene">
            <div className="intro-collection-scene">
              <div className="intro-positioned-copy" style={textPosition(3)}>
                <p className="intro-eyebrow">{heroText?.[3]?.eyebrow || 'Dhikr through observation'}</p>
                <div className="intro-collection-words intro-stage-statement">
                  <span>{heroText?.[3]?.title || 'Painting becomes a form of praise'}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="intro-scene">
            <Link href="#gallery-tour" className="intro-enter-scene">
              <div className="intro-positioned-copy" style={textPosition(4)}>
                <span>{heroText?.[4]?.eyebrow || 'Enter the'}</span>
                <strong>{heroText?.[4]?.title || 'Collection'}</strong>
                <i>→</i>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
