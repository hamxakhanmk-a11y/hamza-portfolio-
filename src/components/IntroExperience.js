'use client';

import Link from 'next/link';
import { useLayoutEffect, useRef } from 'react';
import { siteConfig } from '@/data/config';

export default function IntroExperience({ heroImage, cameraStages, heroText }) {
  const rootRef = useRef(null);
  const mediaRef = useRef(null);
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
    left: `${heroText?.[stage]?.x ?? 50}%`,
    top: `${heroText?.[stage]?.y ?? 50}%`,
  });

  useLayoutEffect(() => {
    const rootElement = rootRef.current;
    let context;
    let observers = [];
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
        const detailCamera = (x, y, zoom) => ({
          scale: zoom,
          xPercent: (x - 50) * (1 - zoom),
          yPercent: (y - 50) * (1 - zoom),
          transformOrigin: '50% 50%',
        });
        const cameraStops = [
          { scale: 1, xPercent: 0, yPercent: 0, transformOrigin: '50% 50%' },
          detailCamera(stage2X, stage2Y, stage2Zoom),
          detailCamera(stage3X, stage3Y, stage3Zoom),
          detailCamera(stage4X, stage4Y, stage4Zoom),
        ];
        let activeStage = 0;
        let animating = false;
        let settingStagePosition = false;

        gsap.set(scenes, { autoAlpha: 0, scale: .985, yPercent: 2 });
        gsap.set(scenes[0], { autoAlpha: 1, scale: 1, yPercent: 0 });
        gsap.set(mediaRef.current, {
          scale: 1,
          xPercent: 0,
          yPercent: 0,
          transformOrigin: '50% 50%',
        });

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
            )
            .to({}, { duration: .16 }, .82);
        }

        function setHeroInteraction(active) {
          rootElement?.classList.toggle('intro-gesture-active', active);
          observers.forEach(observer => active ? observer.enable() : observer.disable());
        }

        function leaveHero(direction) {
          setHeroInteraction(false);
          const heroHeight = rootRef.current?.offsetHeight || window.innerHeight * scenes.length;
          const destination = direction > 0
            ? (rootRef.current?.offsetTop || 0) + heroHeight
            : Math.max(0, sectionTrigger.start - (rootRef.current?.firstElementChild?.clientHeight || window.innerHeight));
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

        const wheelObserver = ScrollTrigger.observe({
          target: window,
          type: 'wheel',
          preventDefault: true,
          allowClicks: true,
          tolerance: 10,
          lockAxis: true,
          onDown: () => changeStage(1),
          onUp: () => changeStage(-1),
        });

        // A finger moving upward means the page should advance, while wheel
        // direction is reported the other way around by Observer.
        const touchObserver = ScrollTrigger.observe({
          target: window,
          type: 'touch',
          preventDefault: true,
          allowClicks: true,
          tolerance: 10,
          lockAxis: true,
          onUp: () => changeStage(1),
          onDown: () => changeStage(-1),
        });
        observers = [wheelObserver, touchObserver];
        setHeroInteraction(false);

        function activateHero(self) {
          setHeroInteraction(true);
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
            if (!settingStagePosition) setHeroInteraction(false);
          },
          onLeaveBack: () => {
            if (!settingStagePosition) setHeroInteraction(false);
          },
        });

        const insideHero = window.scrollY >= sectionTrigger.start && window.scrollY <= sectionTrigger.end;
        if (insideHero) activateHero(sectionTrigger);
        else setHeroInteraction(false);
      }, rootRef);
    }

    createScrollStory();
    return () => {
      cancelled = true;
      stageTimeline?.kill();
      observers.forEach(observer => observer.kill());
      rootElement?.classList.remove('intro-gesture-active');
      sectionTrigger?.kill();
      context?.revert();
    };
  }, [stage2X, stage2Y, stage2Zoom, stage3X, stage3Y, stage3Zoom, stage4X, stage4Y, stage4Zoom]);

  return (
    <section ref={rootRef} className="intro-shell intro-embedded" aria-label="Featured artwork introduction">
      <div className="intro-sticky">
        <div ref={mediaRef} className="intro-media" aria-hidden="true">
          {heroImage ? (
            <>
              <img className="intro-media-backdrop" src={heroImage} alt="" />
              <img className="intro-media-artwork" src={heroImage} alt="" />
            </>
          ) : null}
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
            <Link href="/portfolio" className="intro-enter-scene">
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
