'use client';

import { usePathname } from 'next/navigation';
import { useLayoutEffect, useRef } from 'react';

export default function SiteMotion() {
  const pathname = usePathname();
  const progressRef = useRef(null);

  useLayoutEffect(() => {
    if (pathname.startsWith('/admin')) return undefined;

    let context;
    let mediaQuery;
    let cancelled = false;

    async function setupMotion() {
      const [{ gsap }, scrollTriggerModule] = await Promise.all([
        import('gsap'),
        import('gsap/ScrollTrigger'),
      ]);
      if (cancelled) return;

      const ScrollTrigger = scrollTriggerModule.ScrollTrigger || scrollTriggerModule.default;
      gsap.registerPlugin(ScrollTrigger);
      mediaQuery = gsap.matchMedia();

      context = gsap.context(() => {
        mediaQuery.add('(prefers-reduced-motion: reduce)', () => {
          gsap.set('[data-gsap-reveal], main section, main header, .editorial-art-frame, .living-image, .artwork-inside-motion', {
            clearProps: 'all',
            autoAlpha: 1,
          });
        });

        mediaQuery.add('(prefers-reduced-motion: no-preference)', () => {
          const headings = gsap.utils.toArray('main h1, main h2').filter((heading) => !heading.closest('.intro-shell'));
          headings.forEach((heading) => {
            gsap.fromTo(heading,
              { autoAlpha: 0, y: 42, rotateX: -7, transformOrigin: '50% 100%' },
              {
                autoAlpha: 1,
                y: 0,
                rotateX: 0,
                duration: 0.9,
                ease: 'power3.out',
                scrollTrigger: { trigger: heading, start: 'top 88%', once: true },
              },
            );
          });

          const sections = gsap.utils.toArray('main > section:not(.intro-shell):not([data-scroll-scene]), main > footer:not([data-scroll-scene]), main article > header, [data-gsap-reveal]');
          sections.forEach((section) => {
            gsap.fromTo(section,
              { autoAlpha: 0, y: 34 },
              {
                autoAlpha: 1,
                y: 0,
                duration: 0.85,
                ease: 'power2.out',
                scrollTrigger: { trigger: section, start: 'top 90%', once: true },
              },
            );
          });

          const grids = gsap.utils.toArray('main .grid');
          grids.forEach((grid) => {
            if (grid.closest('[data-scroll-scene]')) return;
            const cards = Array.from(grid.children).filter((child) => child.matches('a, article, figure'));
            if (!cards.length) return;
            gsap.fromTo(cards,
              { autoAlpha: 0, y: 46, scale: 0.975 },
              {
                autoAlpha: 1,
                y: 0,
                scale: 1,
                duration: 0.8,
                stagger: 0.1,
                ease: 'power3.out',
                scrollTrigger: { trigger: grid, start: 'top 86%', once: true },
              },
            );
          });

          gsap.utils.toArray('.living-image').forEach((image, index) => {
            gsap.to(image, {
              scale: 1.025,
              y: index % 2 ? -5 : 5,
              duration: 5.5 + (index % 3),
              repeat: -1,
              yoyo: true,
              ease: 'sine.inOut',
              transformOrigin: '50% 50%',
            });
          });

          gsap.utils.toArray('.editorial-art-frame').forEach((frame, index) => {
            const image = frame.querySelector('.artwork-inside-motion');
            gsap.fromTo(frame,
              { autoAlpha: 0, y: 65 },
              {
                autoAlpha: 1,
                y: 0,
                duration: 1,
                ease: 'power3.out',
                scrollTrigger: { trigger: frame, start: 'top 86%', once: true },
              },
            );
            if (image) {
              gsap.to(image, {
                scale: 1.035,
                x: index % 2 ? 5 : -5,
                duration: 7 + (index % 3),
                repeat: -1,
                yoyo: true,
                ease: 'sine.inOut',
                transformOrigin: '50% 50%',
              });
            }
          });

          if (pathname === '/') {
            gsap.set(progressRef.current, { scaleX: 0, transformOrigin: 'left center' });
            gsap.to(progressRef.current, {
              scaleX: 1,
              ease: 'none',
              scrollTrigger: {
                start: 0,
                end: 'max',
                scrub: 0.25,
              },
            });

            const gallery = document.querySelector('[data-scroll-scene="gallery"]');
            const galleryHeading = gallery?.querySelector('[data-gallery-heading]');
            const galleryRule = gallery?.querySelector('.home-gallery-rule span');
            const galleryCards = gallery ? gsap.utils.toArray('[data-gallery-card]', gallery) : [];

            if (gallery) {
              gsap.fromTo(gallery,
                { clipPath: 'inset(7% 2.5% 0% 2.5% round 2.5rem)', backgroundColor: '#fffaf2' },
                {
                  clipPath: 'inset(0% 0% 0% 0% round 0rem)',
                  backgroundColor: '#ffffff',
                  duration: 1.1,
                  ease: 'power3.out',
                  scrollTrigger: {
                    trigger: gallery,
                    start: 'top 94%',
                    once: true,
                    fastScrollEnd: true,
                  },
                },
              );

              if (galleryHeading) {
                gsap.fromTo(galleryHeading,
                  { autoAlpha: 0, y: 70, rotateX: -9, transformOrigin: '50% 100%' },
                  {
                    autoAlpha: 1,
                    y: 0,
                    rotateX: 0,
                    duration: 1,
                    ease: 'power3.out',
                    scrollTrigger: { trigger: galleryHeading, start: 'top 88%', once: true, fastScrollEnd: true },
                  },
                );
              }

              if (galleryRule) {
                gsap.fromTo(galleryRule,
                  { scaleX: 0, transformOrigin: 'left center' },
                  {
                    scaleX: 1,
                    duration: 1.15,
                    ease: 'power3.inOut',
                    scrollTrigger: { trigger: galleryRule, start: 'top 90%', once: true },
                  },
                );
              }

              galleryCards.forEach((card, index) => {
                const frame = card.querySelector('[data-gallery-frame]');
                const image = card.querySelector('[data-gallery-image]');
                gsap.fromTo(card,
                  { autoAlpha: 0, y: 85 + (index % 2) * 28 },
                  {
                    autoAlpha: 1,
                    y: 0,
                    duration: 1,
                    delay: index * 0.06,
                    ease: 'power3.out',
                    scrollTrigger: { trigger: card, start: 'top 91%', once: true, fastScrollEnd: true },
                  },
                );

                if (frame) {
                  gsap.fromTo(frame,
                    { clipPath: 'inset(100% 0% 0% 0%)' },
                    {
                      clipPath: 'inset(0% 0% 0% 0%)',
                      duration: 1.15,
                      delay: index * 0.06,
                      ease: 'power4.inOut',
                      scrollTrigger: { trigger: card, start: 'top 91%', once: true, fastScrollEnd: true },
                    },
                  );
                }

                if (image) {
                  gsap.fromTo(image,
                    { yPercent: index % 2 ? -5 : 5, scale: 1.035 },
                    {
                      yPercent: index % 2 ? 5 : -5,
                      scale: 1.015,
                      ease: 'none',
                      scrollTrigger: {
                        trigger: card,
                        start: 'top bottom',
                        end: 'bottom top',
                        scrub: 0.7,
                      },
                    },
                  );
                }
              });
            }

            const commissionCard = document.querySelector('[data-commission-card]');
            if (commissionCard) {
              gsap.fromTo(commissionCard,
                { autoAlpha: 0, y: 55, scale: 0.975 },
                {
                  autoAlpha: 1,
                  y: 0,
                  scale: 1,
                  duration: 1,
                  ease: 'power3.out',
                  scrollTrigger: {
                    trigger: commissionCard,
                    start: 'top 90%',
                    once: true,
                    fastScrollEnd: true,
                  },
                },
              );

              gsap.fromTo('[data-commission-copy]',
                { autoAlpha: 0, x: -65 },
                {
                  autoAlpha: 1,
                  x: 0,
                  duration: 1,
                  ease: 'power3.out',
                  scrollTrigger: { trigger: commissionCard, start: 'top 68%', once: true, fastScrollEnd: true },
                },
              );
              gsap.fromTo('[data-commission-form]',
                { autoAlpha: 0, x: 65 },
                {
                  autoAlpha: 1,
                  x: 0,
                  duration: 1,
                  ease: 'power3.out',
                  scrollTrigger: { trigger: commissionCard, start: 'top 68%', once: true, fastScrollEnd: true },
                },
              );
            }

            const contact = document.querySelector('[data-scroll-scene="contact"]');
            if (contact) {
              gsap.fromTo(contact,
                { autoAlpha: 0, y: 55 },
                {
                  autoAlpha: 1,
                  y: 0,
                  duration: 1,
                  ease: 'power3.out',
                  scrollTrigger: { trigger: contact, start: 'top 94%', once: true, fastScrollEnd: true },
                },
              );
            }
          }

        });
      }, document.body);
    }

    setupMotion();
    return () => {
      cancelled = true;
      mediaQuery?.revert();
      context?.revert();
    };
  }, [pathname]);

  if (pathname !== '/') return null;

  return (
    <div className="home-scroll-progress" aria-hidden="true">
      <span ref={progressRef} />
    </div>
  );
}
