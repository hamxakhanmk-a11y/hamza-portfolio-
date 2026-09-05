'use client';

import Image from 'next/image';
import { useState } from 'react';

export default function BalancedArtworkImage({ src, alt, round = false, eager = false, sizes = '(max-width: 640px) 88vw, (max-width: 1024px) 44vw, 30vw' }) {
  const [size, setSize] = useState({ width: '82%', height: '82%' });

  function balanceImage(event) {
    if (round) {
      setSize({ width: '82%', height: '82%' });
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
  }

  return (
    <Image
      src={src}
      alt={alt}
      width={900}
      height={900}
      sizes={sizes}
      loading={eager ? 'eager' : 'lazy'}
      fetchPriority={eager ? 'high' : 'auto'}
      onLoad={balanceImage}
      className={`living-image block transition-[width,height] duration-300 ${round ? 'rounded-full object-cover' : 'object-contain'}`}
      style={{
        ...size,
        clipPath: round ? 'circle(49.5% at 50% 50%)' : 'none',
      }}
    />
  );
}
