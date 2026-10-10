'use client';

import Image from 'next/image';
import { useState } from 'react';
import { getRestoredArtworkImage } from '@/data/artworkImageRestoration';

export default function BalancedArtworkImage({ src, alt, round = false, eager = false, sizes = '(max-width: 640px) 88vw, (max-width: 1024px) 44vw, 30vw' }) {
  const [size, setSize] = useState({ width: '82%', height: '82%' });
  const [ready, setReady] = useState(false);
  const restoration = getRestoredArtworkImage(src);
  const circular = round || Boolean(restoration);

  function balanceImage(event) {
    if (circular) {
      setSize({ width: '82%', height: '82%' });
      setReady(true);
      return;
    }
    const image = event.currentTarget;
    const ratio = image.naturalWidth / image.naturalHeight || 1;
    const targetArea = 0.66;

    let width = Math.sqrt(targetArea * ratio);
    let height = Math.sqrt(targetArea / ratio);

    const largestSide = Math.max(width, height);
    if (largestSide > 1) {
      width /= largestSide;
      height /= largestSide;
    }

    setSize({
      width: `${Math.round(width * 1000) / 10}%`,
      height: `${Math.round(height * 1000) / 10}%`,
    });
    setReady(true);
  }

  return (
    <Image
      src={restoration?.src || src}
      alt={alt}
      width={900}
      height={900}
      sizes={sizes}
      loading={eager ? 'eager' : 'lazy'}
      fetchPriority={eager ? 'high' : 'auto'}
      onLoad={balanceImage}
      onError={() => setReady(true)}
      className={`living-image block transition-opacity duration-500 ${circular ? 'object-cover' : 'object-contain'}`}
      style={{
        ...size,
        opacity: ready ? 1 : 0,
        clipPath: restoration?.clipPath || (round ? 'circle(49.5% at 50% 50%)' : 'none'),
        scale: restoration?.scale,
        filter: 'drop-shadow(0 18px 14px rgba(0,0,0,.16))',
      }}
    />
  );
}
