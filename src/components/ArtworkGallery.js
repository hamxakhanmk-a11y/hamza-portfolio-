'use client';

import { useState } from 'react';

export default function ArtworkGallery({ images, title }) {
  const [selected, setSelected] = useState(0);

  return (
    <div className="flex flex-col gap-4">
      {/* Main image */}
      <div className="w-fit max-w-full mx-auto overflow-hidden">
        <img
          src={images[selected].image_url}
          alt={title}
          className="living-image w-auto max-w-full h-auto max-h-[680px] object-contain block transition-opacity duration-300"
          style={{
            mixBlendMode: 'multiply',
            filter: images[selected].image_url?.toLowerCase().includes('.png')
              ? 'drop-shadow(0 18px 14px rgba(0,0,0,.15))'
              : 'none',
          }}
        />
      </div>

      {/* Thumbnails — only if more than one image */}
      {images.length > 1 && (
        <div className="flex gap-2 flex-wrap">
          {images.map((img, i) => (
            <button
              key={i}
              onClick={() => setSelected(i)}
              className={`w-16 h-16 overflow-hidden border-2 bg-neutral-50 transition-all duration-200 ${
                selected === i
                  ? 'border-neutral-700'
                  : 'border-transparent opacity-55 hover:opacity-90'
              }`}
            >
              <img
                src={img.image_url}
                alt={`${title} view ${i + 1}`}
                className="living-image w-full h-full object-contain"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
