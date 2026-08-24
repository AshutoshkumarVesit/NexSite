import { useEffect, useRef } from 'react';

export function BackgroundVideo() {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (video) {
      video.muted = true;
      video.defaultMuted = true;
      const playPromise = video.play();
      if (playPromise !== undefined) {
        playPromise.catch((err) => {
          console.warn('[BackgroundVideo] Autoplay prevented or failed:', err);
        });
      }
    }
  }, []);

  return (
    <div className="nex-video-bg-container" aria-hidden="true">
      <video
        ref={videoRef}
        className="nex-video-bg-media"
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        onCanPlay={() => {
          if (videoRef.current) {
            videoRef.current.play().catch(() => {});
          }
        }}
      >
        <source src="/typing-bg.mp4" type="video/mp4" />
      </video>
      <div className="nex-video-bg-overlay" />
    </div>
  );
}
