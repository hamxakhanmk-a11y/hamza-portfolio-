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
    let observer;
    let sectionTrigger;
    let stageTimeline;
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
        const cameraStops = [
          { scale: 1, transformOrigin: '50% 50%' },
          { scale: stage2Zoom, transformOrigin: `${stage2X}% ${stage2Y}%` },
          { scale: stage3Zoom, transformOrigin: `${stage3X}% ${stage3Y}%` },
          { scale: 1, transformOrigin: '50% 50%' },
        ];
        let activeStage = 0;
        let animating = false;
        let settingStagePosition = false;

        gsap.set(scenes, { autoAlpha: 0, scale: .985, yPercent: 2 });
        gsap.set(scenes[0], { autoAlpha: 1, scale: 1, yPercent: 0 });
        gsap.set(mediaRef.current, { scale: 1, transformOrigin: '50% 50%' });

        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

        function scrollToStage(index) {
          if (!sectionTrigger) return;
          const rawPosition = sectionTrigger.start
            + ((sectionTrigger.end - sectionTrigger.start) * index / (scenes.length - 1));
          const stagePosition = index === 0
            ? sectionTrigger.start + 1
            : index === scenes.length - 1
              ? sectionTrigger.end - 1
              : rawPosition;
          settingStagePosition = true;
          window.scrollTo({ top: Math.round(stagePosition), behavior: 'auto' });
          window.requestAnimationFrame(() => {
            settingStagePosition = false;
          });
        }

        function showStage(index, immediate = false) {
          const previousStage = activeStage;
          const camera = cameraStops[index];
          activeStage = index;
          stageTimeline?.kill();

          if (immediate) {
            animating = false;
            gsap.set(mediaRef.current, { ...camera, force3D: true });
            scenes.forEach((scene, sceneIndex) => {
              gsap.set(scene, {
                autoAlpha: sceneIndex === index ? 1 : 0,
                scale: sceneIndex === index ? 1 : .985,
                yPercent: sceneIndex === index ? 0 : 2,
              });
            });
            return;
          }

          animating = true;
          scrollToStage(index);
          stageTimeline = gsap.timeline({
            defaults: { overwrite: 'auto' },
            onComplete: () => { animating = false; },
            onInterrupt: () => { animating = false; },
          });

          // One camera stop and one text scene share the same landing time.
          stageTimeline
            .to(scenes[previousStage], {
              autoAlpha: 0,
              scale: 1.02,
              yPercent: -2,
              duration: .22,
              ease: 'power1.in',
            }, 0)
            .to(mediaRef.current, {
              ...camera,
              smoothOrigin: true,
              force3D: true,
              duration: .82,
              ease: 'power3.inOut',
            }, 0)
            .fromTo(scenes[index],
              { autoAlpha: 0, scale: .985, yPercent: 2 },
              {
                autoAlpha: 1,
                scale: 1,
                yPercent: 0,
                duration: .3,
                ease: 'power2.out',
              },
              .52,
            );
        }

        function leaveHero(direction) {
          observer.disable();
          const destination = direction > 0
            ? sectionTrigger.end + window.innerHeight
            : Math.max(0, sectionTrigger.start - window.innerHeight);
          window.scrollTo({ top: destination, behavior: 'smooth' });
        }

        function changeStage(direction) {
          if (animating) return;
          const nextStage = activeStage + direction;
          if (nextStage < 0 || nextStage >= scenes.length) {
            leaveHero(direction);
            return;
          }
          showStage(nextStage);
        }

        observer = ScrollTrigger.observe({
          target: window,
          type: 'wheel,touch',
          preventDefault: true,
          allowClicks: true,
          tolerance: 10,
          onDown: () => changeStage(1),
          onUp: () => changeStage(-1),
        });

        function activateHero(self) {
          observer.enable();
          if (settingStagePosition || animating) return;
          const nearestStage = Math.round(self.progress * (scenes.length - 1));
          activeStage = Math.min(scenes.length - 1, Math.max(0, nearestStage));
          showStage(activeStage, true);
          scrollToStage(activeStage);
        }

        sectionTrigger = ScrollTrigger.create({
          trigger: rootRef.current,
          start: 'top top',
          end: 'bottom bottom',
          onEnter: activateHero,
          onEnterBack: activateHero,
          onLeave: () => {
            if (!settingStagePosition) observer.disable();
          },
          onLeaveBack: () => {
            if (!settingStagePosition) observer.disable();
          },
        });

        const insideHero = window.scrollY >= sectionTrigger.start && window.scrollY <= sectionTrigger.end;
        if (insideHero) activateHero(sectionTrigger);
        else observer.disable();
      }, rootRef);
    }

    createScrollStory();
    return () => {
      cancelled = true;
      stageTimeline?.kill();
      observer?.kill();
      sectionTrigger?.kill();
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
