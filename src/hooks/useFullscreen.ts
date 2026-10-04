import { useState, useEffect, useCallback } from 'react';

export function useFullscreen() {
  const [isFullscreen, setIsFullscreen] = useState<boolean>(() => {
    if (typeof document === 'undefined') return false;
    return !!(
      document.fullscreenElement ||
      (document as any).webkitFullscreenElement ||
      (document as any).mozFullScreenElement ||
      (document as any).msFullscreenElement
    );
  });

  const [isInAppFullscreen, setIsInAppFullscreen] = useState<boolean>(false);
  const [isIframe, setIsIframe] = useState<boolean>(false);
  const [isSupported, setIsSupported] = useState<boolean>(true);

  useEffect(() => {
    if (typeof document === 'undefined') return;

    try {
      setIsIframe(window.self !== window.top);
    } catch {
      setIsIframe(true);
    }

    const checkSupported =
      document.fullscreenEnabled ||
      (document as any).webkitFullscreenEnabled ||
      (document as any).mozFullScreenEnabled ||
      (document as any).msFullscreenEnabled;

    setIsSupported(checkSupported !== undefined ? !!checkSupported : true);

    const handleFullscreenChange = () => {
      const isNowFullscreen = !!(
        document.fullscreenElement ||
        (document as any).webkitFullscreenElement ||
        (document as any).mozFullScreenElement ||
        (document as any).msFullscreenElement
      );
      setIsFullscreen(isNowFullscreen);
      if (isNowFullscreen) {
        setIsInAppFullscreen(true);
      }
      document.documentElement.classList.toggle('app-fullscreen-active', isNowFullscreen);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
    };
  }, []);

  // Sync in-app fullscreen class
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const active = isFullscreen || isInAppFullscreen;
    document.documentElement.classList.toggle('app-fullscreen-active', active);
  }, [isFullscreen, isInAppFullscreen]);

  const toggleFullscreen = useCallback(async () => {
    if (typeof document === 'undefined') return;

    const doc = document as any;
    const docEl = document.documentElement as any;

    const isCurrent = !!(
      doc.fullscreenElement ||
      doc.webkitFullscreenElement ||
      doc.mozFullScreenElement ||
      doc.msFullscreenElement ||
      isInAppFullscreen
    );

    if (!isCurrent) {
      try {
        const options: FullscreenOptions = { navigationUI: 'hide' };
        if (docEl.requestFullscreen) {
          await docEl.requestFullscreen(options);
          setIsFullscreen(true);
          setIsInAppFullscreen(true);
          return;
        } else if (docEl.webkitRequestFullscreen) {
          await docEl.webkitRequestFullscreen();
          setIsFullscreen(true);
          setIsInAppFullscreen(true);
          return;
        } else if (docEl.mozRequestFullScreen) {
          await docEl.mozRequestFullScreen();
          setIsFullscreen(true);
          setIsInAppFullscreen(true);
          return;
        } else if (docEl.msRequestFullscreen) {
          await docEl.msRequestFullscreen();
          setIsFullscreen(true);
          setIsInAppFullscreen(true);
          return;
        }
      } catch (err) {
        console.warn('Native requestFullscreen failed (possibly in iframe), activating in-app immersive mode:', err);
      }
      // Fallback: In-app immersive fullscreen
      setIsInAppFullscreen(true);
    } else {
      try {
        if (doc.exitFullscreen && (doc.fullscreenElement || doc.webkitFullscreenElement)) {
          await doc.exitFullscreen();
        } else if (doc.webkitExitFullscreen && doc.webkitFullscreenElement) {
          await doc.webkitExitFullscreen();
        }
      } catch (err) {
        console.warn('Exit fullscreen failed:', err);
      }
      setIsFullscreen(false);
      setIsInAppFullscreen(false);
    }
  }, [isInAppFullscreen]);

  // F11 keyboard shortcut support for PC
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F11') {
        e.preventDefault();
        toggleFullscreen();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleFullscreen]);

  const openInNewTab = useCallback(() => {
    if (typeof window !== 'undefined') {
      window.open(window.location.href, '_blank');
    }
  }, []);

  return {
    isFullscreen: isFullscreen || isInAppFullscreen,
    isNativeFullscreen: isFullscreen,
    isInAppFullscreen,
    isIframe,
    toggleFullscreen,
    openInNewTab,
    isSupported,
  };
}
