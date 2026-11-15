import React, { useState } from 'react';

export function MediaFrame({ src, type='photo', alt='', ratio='16:9', overlay, className='' }) {
  const [failedSrc, setFailedSrc] = useState('');
  const usable = typeof src === 'string' && src.length > 0 && failedSrc !== src;
  const mediaClass = 'vsr-media-frame__asset';
  return (
    <div className={['vsr-media-frame', 'vsr-media-frame--'+ratio.replace(':','-'), className].filter(Boolean).join(' ')}>
      {usable ? (
        type === 'video' ? (
          <video key={src} className={mediaClass} src={src} autoPlay muted loop playsInline onError={() => setFailedSrc(src)} />
        ) : (
          <img key={src} className={mediaClass} src={src} alt={alt} onError={() => setFailedSrc(src)} />
        )
      ) : (
        <div className="vsr-media-frame__fallback" aria-hidden="true">
          <span className="material-symbols-rounded">image</span>
        </div>
      )}
      {overlay && <div className="vsr-media-frame__overlay">{overlay}</div>}
    </div>
  );
}
