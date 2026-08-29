'use client';

import Link from 'next/link';
import { useLayoutEffect, useRef } from 'react';
import styles from './IntroExperience.module.css';

const studioLinks = [
  { label: 'Portfolio', href: '/portfolio' },
  { label: 'Commissions', href: '/commissions' },
  { label: 'Shows', href: '/shows' },
  { label: 'About', href: '/about' },
  { label: 'Contact', href: '/contact' },
];

export default function IntroExperience({ heroImage, animatedImage, settings }) {
  const rootRef = useRef(null);
  const deviceRef = useRef(null);
  const artworkRef = useRef(null);
  const titleRef = useRef(null);
  const featuredMedia = animatedImage || heroImage;
  const featuredIsVideo = /\.(mp4|webm)(?:\?|$)/i.test(featuredMedia || '');
  const mediaPosition = `${settings?.x ?? 50}% ${settings?.y ?? 50}%`;
  const mediaZoom = Math.max(1, Number(settings?.zoom || 1));

  useLayoutEffect(() => {
    let context;
    let cancelled = false;

    async function animateHero() {
      const [{ gsap }, scrollTriggerModule] = await Promise.all([
        import('gsap'),
        import('gsap/ScrollTrigger'),
      ]);
      if (cancelled || !rootRef.current) return;

      const ScrollTrigger = scrollTriggerModule.ScrollTrigger || scrollTriggerModule.default;
      gsap.registerPlugin(ScrollTrigger);

      context = gsap.context(() => {
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

        const entrance = gsap.timeline({ defaults: { ease: 'power3.out' } });
        entrance
          .fromTo(deviceRef.current, { autoAlpha: 0, y: 50, scale: 0.965 }, { autoAlpha: 1, y: 0, scale: 1, duration: 1.1 })
          .fromTo(`.${styles.utility}`, { autoAlpha: 0, y: -12 }, { autoAlpha: 1, y: 0, duration: 0.55 }, 0.25)
          .fromTo(`.${styles.screenNav} a`, { autoAlpha: 0, y: -10 }, { autoAlpha: 1, y: 0, stagger: 0.07, duration: 0.45 }, 0.32)
          .fromTo(artworkRef.current, { autoAlpha: 0, y: 45, rotate: -2, scale: 0.9 }, { autoAlpha: 1, y: 0, rotate: 0, scale: 1, duration: 1.15 }, 0.4)
          .fromTo(`.${styles.caption}`, { autoAlpha: 0, y: 18 }, { autoAlpha: 1, y: 0, stagger: 0.12, duration: 0.55 }, 0.7)
          .fromTo(titleRef.current, { autoAlpha: 0, yPercent: 40 }, { autoAlpha: 1, yPercent: 0, duration: 0.85 }, 0.55);

        gsap.to(`.${styles.artworkMedia}`, {
          y: -10,
          rotate: 0.6,
          duration: 4.8,
          repeat: -1,
          yoyo: true,
          ease: 'sine.inOut',
        });

        gsap.timeline({
          scrollTrigger: {
            trigger: rootRef.current,
            start: 'top top',
            end: 'bottom top',
            scrub: 0.8,
          },
        })
          .to(artworkRef.current, { yPercent: 12, scale: 1.035, ease: 'none' }, 0)
          .to(titleRef.current, { yPercent: -16, letterSpacing: '0.015em', ease: 'none' }, 0)
          .to(deviceRef.current, { y: 35, scale: 0.985, ease: 'none' }, 0);
      }, rootRef);
    }

    animateHero();
    return () => {
      cancelled = true;
      context?.revert();
    };
  }, []);

  return (
    <section ref={rootRef} className={styles.hero} aria-label="Featured artwork">
      <div className={styles.backdrop} aria-hidden="true">
        {heroImage && <img src={heroImage} alt="" />}
      </div>

      <div className={styles.glow} aria-hidden="true" />

      <div ref={deviceRef} className={styles.device}>
        <div className={styles.frame}>
          <div className={styles.camera} aria-hidden="true" />
          <div className={styles.screen}>
            <p className={styles.utility}>Original art · Painted by hand · Created in Pakistan</p>

            <nav className={styles.screenNav} aria-label="Studio navigation">
              {studioLinks.map(link => (
                <Link key={link.href} href={link.href}>{link.label}</Link>
              ))}
            </nav>

            <div className={styles.gridLines} aria-hidden="true" />

            <div ref={artworkRef} className={styles.artwork}>
              <div className={styles.artworkShadow} aria-hidden="true" />
              <div className={styles.artworkMedia} style={{ '--media-zoom': mediaZoom }}>
                {featuredMedia && featuredIsVideo ? (
                  <video
                    src={featuredMedia}
                    muted
                    loop
                    autoPlay
                    playsInline
                    preload="auto"
                    style={{ objectPosition: mediaPosition }}
                  />
                ) : featuredMedia ? (
                  <img src={featuredMedia} alt="Featured artwork by Hamza Khan" style={{ objectPosition: mediaPosition }} />
                ) : (
                  <div className={styles.artworkPlaceholder}>Upload your homepage artwork in Admin</div>
                )}
              </div>
            </div>

            <p className={`${styles.caption} ${styles.captionLeft}`}>Contemporary miniature<br />rooted in tradition</p>
            <p className={`${styles.caption} ${styles.captionCenter}`}>Painted with<br />intention</p>
            <Link href="/portfolio" className={`${styles.caption} ${styles.captionRight}`}>
              Explore the<br />collection →
            </Link>

            <h1 ref={titleRef} className={styles.wordmark}>HAMZA ART</h1>
          </div>
        </div>
        <div className={styles.base} aria-hidden="true"><span /></div>
      </div>

      <a href="#gallery" className={styles.scrollCue}>
        <span>Scroll to discover</span>
        <i>↓</i>
      </a>
    </section>
  );
}
