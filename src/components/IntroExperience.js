'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { siteConfig } from '@/data/config';

const chapters = ['Intro', 'Artwork', 'Collections', 'Enter'];

export default function IntroExperience({ heroImage, animatedImage, settings }) {
  const [chapter, setChapter] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (chapter < chapters.length - 1) setChapter(value => value + 1);
      else setChapter(0);
    }, chapter === 0 ? 2400 : 2700);
    return () => clearTimeout(timer);
  }, [chapter]);

  const animatedIsVideo = /\.(mp4|webm)(?:\?|$)/i.test(animatedImage || '');
  const mediaStyle = {
    objectPosition: `${settings?.x ?? 50}% ${settings?.y ?? 50}%`,
    transform: `scale(${settings?.zoom ?? 1})`,
  };

  return (
    <section className="intro-shell intro-embedded" aria-label="Featured artwork introduction">
      <div className="intro-brand">{siteConfig.artistName}</div>

      <div className="intro-canvas">
        <div key={chapter} className="intro-scene">
          {chapter === 0 && (
            <div className="intro-type-scene">
              <p className="intro-eyebrow">Original Artworks</p>
              <div className="intro-letter-line" aria-label={siteConfig.artistName}>
                {siteConfig.artistName.split('').map((letter, index) => (
                  <span key={`${letter}-${index}`} style={{ animationDelay: `${index * 70}ms` }}>{letter === ' ' ? '\u00a0' : letter}</span>
                ))}
              </div>
            </div>
          )}

          {chapter === 1 && (
            <div className="intro-art-scene">
              {animatedImage && animatedIsVideo ? (
                <video src={animatedImage} muted loop autoPlay playsInline preload="metadata" style={mediaStyle} />
              ) : animatedImage ? (
                <img src={animatedImage} alt="Animated featured painting" style={mediaStyle} />
              ) : heroImage ? (
                <img src={heroImage} alt="Featured painting" />
              ) : null}
              <div className="intro-art-copy">
                <p>Painted with intention</p>
                <h2>Where imagination flows</h2>
              </div>
            </div>
          )}

          {chapter === 2 && (
            <div className="intro-collection-scene">
              <p className="intro-eyebrow">Explore the Studio</p>
              <div className="intro-collection-words">
                <span>Portfolio</span><span>Commissions</span><span>Shows</span>
              </div>
            </div>
          )}

          {chapter === 3 && (
            <Link href="/portfolio" className="intro-enter-scene">
              <span>Enter the</span>
              <strong>Collection</strong>
              <i>→</i>
            </Link>
          )}
        </div>
      </div>

      <div className="intro-chapters">
        {chapters.map((label, index) => (
            <button type="button" key={label} onClick={() => setChapter(index)} className={chapter === index ? 'active' : ''}>
            <span>{label}</span>
            {chapter === index && <i />}
          </button>
        ))}
      </div>

      <div className="intro-ruler" aria-hidden="true">
        {Array.from({ length: 42 }).map((_, index) => <span key={index} />)}
      </div>
    </section>
  );
}
