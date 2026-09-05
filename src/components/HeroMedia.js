import { forwardRef } from 'react';

export function isVideoSource(source, mimeType = '') {
  if (mimeType.toLowerCase().startsWith('video/')) return true;
  const pathname = String(source || '').split(/[?#]/, 1)[0].toLowerCase();
  return /\.(mp4|webm|ogv|ogg|mov|m4v)$/.test(pathname);
}

const HeroMedia = forwardRef(function HeroMedia({ src, mimeType = '', alt = '', className = '', style, preload = 'metadata' }, ref) {
  if (isVideoSource(src, mimeType)) {
    return (
      <video
        ref={ref}
        src={src}
        className={className}
        style={style}
        autoPlay
        muted
        loop
        playsInline
        preload={preload}
        aria-label={alt || undefined}
        draggable={false}
      />
    );
  }

  return <img ref={ref} src={src} alt={alt} className={className} style={style} draggable={false} />;
});

export default HeroMedia;
