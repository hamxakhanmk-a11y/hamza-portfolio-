'use client';

import { useState } from 'react';

export default function BalancedArtworkImage({ src, alt }) {
  const [size, setSize] = useState({ width: '82%', height: '82%' });

  function balanceImage(event) {
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
    <img
      src={src}
      alt={alt}
      onLoad={balanceImage}
      className="block object-contain transition-[width,height] duration-300"
      style={{
        ...size,
        mixBlendMode: 'multiply',
        filter: src?.toLowerCase().includes('.png')
          ? 'drop-shadow(0 18px 14px rgba(0,0,0,.16))'
          : 'none',
      }}
    />
  );
}
