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
        gsap.set(scenes, { autoAlpha: 0, scale: .985 });
        gsap.set(scenes[0], { autoAlpha: 1, scale: 1 });

        gsap.to(mediaRef.current, {
          scale: 1.045,
          duration: 7,
          repeat: -1,
          yoyo: true,
          ease: 'sine.inOut',
        });

        const story = gsap.timeline({
          defaults: { ease: 'power2.inOut' },
          scrollTrigger: {
            trigger: rootRef.current,
            start: 'top top',
            end: '+=300%',
            pin: true,
            scrub: .8,
            anticipatePin: 1,
            invalidateOnRefresh: true,
            snap: {
              snapTo: 'labels',
              duration: { min: .25, max: .7 },
              delay: .12,
              ease: 'power2.inOut',
            },
          },
        });

        story.addLabel('intro', 0);
        for (let index = 1; index < scenes.length; index += 1) {
          const transitionAt = index - .28;
          story
            .addLabel(['artwork', 'collections', 'enter'][index - 1], index)
            .to(scenes[index - 1], { autoAlpha: 0, scale: .975, yPercent: -2, duration: .5 }, transitionAt)
            .fromTo(
              scenes[index],
              { autoAlpha: 0, scale: 1.025, yPercent: 3 },
              { autoAlpha: 1, scale: 1, yPercent: 0, duration: .5, immediateRender: false },
              transitionAt,
            );
        }
        story.to({}, { duration: .01 }, 3.01);
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
    </section>
  );
}
