'use client';

import { usePathname } from 'next/navigation';
import { useLayoutEffect } from 'react';

export default function SiteMotion() {
  const pathname = usePathname();

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
          gsap.set('[data-gsap-reveal], main section:not(#gallery-tour), main header, .editorial-art-frame, .living-image, .artwork-inside-motion', {
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

          const sections = gsap.utils.toArray('main > section:not(.intro-shell):not(#gallery-tour), main > footer, main article > header, [data-gsap-reveal]');
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

          gsap.utils.toArray('.editorial-art-frame').forEach((frame) => {
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
          });

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

  return null;
}
