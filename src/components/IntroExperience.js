'use client';

import { useEffect, useState } from 'react';
import { siteConfig } from '@/data/config';

const chapters = ['Intro', 'Artwork', 'Collections', 'Enter'];

export default function IntroExperience({ heroImage }) {
  const [visible, setVisible] = useState(true);
  const [chapter, setChapter] = useState(0);
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    const forceReplay = new URLSearchParams(window.location.search).get('intro') === '1';
    if (sessionStorage.getItem('site_intro_seen') && !forceReplay) {
      // The server renders the intro so first-time visitors never see a flash of the page.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setVisible(false);
    }
  }, []);

  useEffect(() => {
    if (!visible) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previousOverflow; };
  }, [visible]);

  useEffect(() => {
    if (!visible || closing) return;
    const timer = setTimeout(() => {
      if (chapter < chapters.length - 1) setChapter(value => value + 1);
      else {
        setClosing(true);
        sessionStorage.setItem('site_intro_seen', 'true');
        setTimeout(() => setVisible(false), 750);
      }
    }, chapter === 0 ? 2400 : 2700);
    return () => clearTimeout(timer);
  }, [chapter, visible, closing]);

  function finishIntro() {
    setClosing(true);
    sessionStorage.setItem('site_intro_seen', 'true');
    setTimeout(() => setVisible(false), 750);
  }

  if (!visible) return null;

  return (
    <div className={`intro-shell ${closing ? 'intro-closing' : ''}`} role="dialog" aria-label="Website introduction">
      <button type="button" onClick={finishIntro} className="intro-skip">Skip intro</button>

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
              {heroImage && <img src={heroImage} alt="Featured painting" />}
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
            <button onClick={finishIntro} className="intro-enter-scene">
              <span>Enter the</span>
              <strong>Collection</strong>
              <i>→</i>
            </button>
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
    </div>
  );
}
